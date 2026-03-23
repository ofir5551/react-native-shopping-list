import { ShoppingList } from '../types';
import { supabase } from '../supabase';
import { sanitizeRecents } from '../utils/recents';

export class SupabaseApiClient {
    constructor(private userId: string) { }

    async fetchLists(): Promise<ShoppingList[]> {
        const { data, error } = await supabase
            .from('lists')
            .select('*');

        if (error) {
            console.error('Error loading cloud lists:', error);
            throw error;
        }

        return (data || []).map((row: any) => ({
            id: row.id,
            name: row.name,
            ...(row.description ? { description: row.description } : {}),
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            items: row.items || [],
            recents: sanitizeRecents(row.recents || []),
            ownerId: row.user_id,
            shareCode: row.share_code,
        }));
    }

    async upsertList(list: ShoppingList): Promise<void> {
        const isOwned = !list.ownerId || list.ownerId === this.userId;

        if (isOwned) {
            const { error } = await supabase
                .from('lists')
                .upsert({
                    id: list.id,
                    user_id: this.userId,
                    name: list.name,
                    description: list.description ?? null,
                    created_at: list.createdAt,
                    updated_at: list.updatedAt,
                    items: list.items,
                    recents: list.recents,
                }, { onConflict: 'id' });

            if (error) {
                console.error('Error upserting owned list:', list.id, error);
                throw error;
            }
        } else {
            const { error } = await supabase
                .from('lists')
                .update({
                    items: list.items,
                    recents: list.recents,
                    updated_at: list.updatedAt,
                })
                .eq('id', list.id);

            if (error) {
                console.error('Error updating shared list:', list.id, error);
                throw error;
            }
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
            throw error;
        }
    }

    async joinList(shareCode: string): Promise<void> {
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

    subscribeRealtime(onEvent: () => void): () => void {
        const listsChannel = supabase
            .channel('shared:lists')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'lists' },
                onEvent
            )
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'list_shares',
                    filter: `user_id=eq.${this.userId}`,
                },
                onEvent
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'list_shares',
                },
                onEvent
            )
            .subscribe();

        return () => {
            supabase.removeChannel(listsChannel);
        };
    }
}
