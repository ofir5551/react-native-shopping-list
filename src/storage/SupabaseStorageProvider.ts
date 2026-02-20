import { ShoppingList } from '../types';
import { StorageProvider } from '../storage';
import { supabase } from '../supabase';
import { sanitizeRecents } from '../utils/recents';

export class SupabaseStorageProvider implements StorageProvider {
    constructor(private userId: string) { }

    async loadLists(): Promise<ShoppingList[]> {
        const { data, error } = await supabase
            .from('lists')
            .select('*');

        if (error) {
            console.error('Error loading cloud lists:', error);
            return [];
        }

        return (data || []).map((row: any) => ({
            id: row.id,
            name: row.name,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            items: row.items || [],
            recents: sanitizeRecents(row.recents || []),
            ownerId: row.user_id,
            shareCode: row.share_code,
        }));
    }

    async saveLists(lists: ShoppingList[]): Promise<void> {
        for (const list of lists) {
            const isOwned = !list.ownerId || list.ownerId === this.userId;

            if (isOwned) {
                // Owned lists: upsert (handles both new and existing)
                const { error } = await supabase
                    .from('lists')
                    .upsert({
                        id: list.id,
                        user_id: this.userId,
                        name: list.name,
                        created_at: list.createdAt,
                        updated_at: list.updatedAt,
                        items: list.items,
                        recents: list.recents,
                    }, { onConflict: 'id' });

                if (error) {
                    console.error('Error saving owned list:', list.id, error);
                }
            } else {
                // Shared lists: use update (INSERT policy would block upsert)
                const { error } = await supabase
                    .from('lists')
                    .update({
                        items: list.items,
                        recents: list.recents,
                        updated_at: list.updatedAt,
                    })
                    .eq('id', list.id);

                if (error) {
                    console.error('Error saving shared list:', list.id, error);
                }
            }
        }
    }

    subscribe(onChange: (lists: ShoppingList[]) => void): () => void {
        const refetch = async () => {
            const lists = await this.loadLists();
            onChange(lists);
        };

        // Listen for changes on lists the user owns or is shared with
        const listsChannel = supabase
            .channel('shared:lists')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'lists' },
                refetch
            )
            // Listen for new list_shares (e.g. user joins a list)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'list_shares',
                    filter: `user_id=eq.${this.userId}`,
                },
                refetch
            )
            // Listen for deleted list_shares (e.g. user exits or owner removes them)
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'list_shares',
                },
                refetch
            )
            .subscribe();

        return () => {
            supabase.removeChannel(listsChannel);
        };
    }

    async joinList(shareCode: string): Promise<void> {
        // Use an RPC (SECURITY DEFINER) to look up the list_id by share_code,
        // bypassing RLS which would block a non-member from seeing the list.
        const { data: listId, error: lookupError } = await supabase
            .rpc('get_list_id_by_share_code', { p_share_code: shareCode });

        if (lookupError || !listId) {
            throw new Error('No list found with that Share Code. Please check the code and try again.');
        }

        const { error } = await supabase
            .from('list_shares')
            .insert({
                list_id: listId,
                user_id: this.userId,
                created_at: Date.now(),
            });

        if (error) {
            if (error.code === '23505') {
                // Unique constraint: already joined
                throw new Error('You have already joined this list.');
            }
            console.error('Error joining list:', error);
            throw new Error('Failed to join list. Please try again.');
        }
    }

    async leaveList(listId: string): Promise<void> {
        const { error } = await supabase
            .from('list_shares')
            .delete()
            .eq('list_id', listId)
            .eq('user_id', this.userId);

        if (error) {
            console.error('Error leaving list:', error);
            throw new Error('Failed to leave list. Please try again.');
        }
    }

    async deleteList(listId: string): Promise<void> {
        const { error } = await supabase
            .from('lists')
            .delete()
            .eq('id', listId)
            .eq('user_id', this.userId);

        if (error) {
            console.error('Error deleting list from DB:', error);
            throw new Error('Failed to delete list. Please try again.');
        }
    }
}
