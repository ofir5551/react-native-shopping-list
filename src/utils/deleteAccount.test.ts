import { deleteAccount } from './deleteAccount';
import { supabase } from '../supabase';

jest.mock('../supabase', () => ({
    supabase: {
        functions: { invoke: jest.fn() },
        auth: { signOut: jest.fn() },
    },
}));

const mockInvoke = supabase.functions.invoke as jest.Mock;
const mockSignOut = supabase.auth.signOut as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('deleteAccount', () => {
    it('invokes the edge function then signs out locally', async () => {
        mockInvoke.mockResolvedValue({ data: { success: true }, error: null });
        mockSignOut.mockResolvedValue({ error: null });

        await deleteAccount();

        expect(mockInvoke).toHaveBeenCalledWith('delete-account');
        expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
    });

    it('throws and keeps the session when the server call fails', async () => {
        mockInvoke.mockResolvedValue({ data: null, error: new Error('boom') });

        await expect(deleteAccount()).rejects.toThrow('boom');
        expect(mockSignOut).not.toHaveBeenCalled();
    });
});
