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
        // Only save lists we own — shared lists are managed by their owner
        const ownedLists = lists.filter(
            (list) => !list.ownerId || list.ownerId === this.userId
        );
        for (const list of ownedLists) {
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
                console.error('Error saving list to cloud:', list.id, error);
            }
        }
    }

    subscribe(onChange: (lists: ShoppingList[]) => void): () => void {
        const refetch = async () => {
            const lists = await this.loadLists();
            onChange(lists);
        };

        // Listen for changes on lists the user owns
        const listsChannel = supabase
            .channel('shared:lists')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'lists' },
                refetch
            )
            // Also listen for new list_shares (e.g. user joins a list)
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
}
