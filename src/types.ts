export type ShoppingItem = {
  id: string;
  name: string;
  purchased: boolean;
  createdAt: number;
};

export type ShoppingList = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  items: ShoppingItem[];
  recents: string[];
};

export type AppRoute =
  | { name: 'lists' }
  | { name: 'list'; listId: string }
  | { name: 'settings' };

