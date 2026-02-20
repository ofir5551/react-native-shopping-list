import { ShoppingList } from '../types';
import { StorageProvider } from '../storage';
import { supabase } from '../supabase';
import { sanitizeRecents } from '../utils/recents';

export class SupabaseStorageProvider implements StorageProvider {
    constructor(private userId: string) { }

    async loadLists(): Promise<ShoppingList[]> {
        const { data, error } = await supabase
            .from('lists')
            .select('*')
            .eq('user_id', this.userId);

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
        }));
    }

    async saveLists(lists: ShoppingList[]): Promise<void> {
        for (const list of lists) {
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
        const channel = supabase
            .channel('public:lists')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'lists',
                    filter: `user_id=eq.${this.userId}`,
                },
                async () => {
                    // Refetch all lists when any change occurs to ensure consistency
                    const lists = await this.loadLists();
                    onChange(lists);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }
}
