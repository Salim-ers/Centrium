import { createClient } from '@/lib/supabase/client';
import type { Contract, ContractStatus, ServiceResult } from '@/types';
import type { ContractInput } from '@/lib/validators/contract';

async function apiCall<T>(
  url: string,
  init: RequestInit,
): Promise<ServiceResult<T>> {
  try {
    const res = await fetch(url, init);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        data: null,
        error: { message: body.message ?? body.error ?? 'Requête échouée' } as any,
      };
    }
    return { data: (body.data ?? body) as T, error: null };
  } catch (e) {
    return { data: null, error: { message: (e as Error).message } as any };
  }
}

export const contractService = {
  // Reads : client direct (RLS SELECT marche)
  async list(
    filters: { status?: ContractStatus; archived?: boolean } = {}
  ): Promise<ServiceResult<Contract[]>> {
    const supabase = createClient();
    const archived = filters.archived ?? false;
    let query = supabase.from('contracts').select('*').eq('archived', archived);
    if (filters.status) query = query.eq('status', filters.status);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return { data: null, error };
    return { data: data as Contract[], error: null };
  },

  async getById(id: string): Promise<ServiceResult<Contract>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return { data: null, error };
    return { data: data as Contract, error: null };
  },

  // Writes : passent par /api/contracts (service_role serveur)
  async create(
    input: Omit<ContractInput, 'contract_number'> & { contract_number?: string },
    _organizationId: string,
  ): Promise<ServiceResult<Contract>> {
    return apiCall<Contract>('/api/contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  },

  async update(
    id: string,
    input: Partial<ContractInput>,
  ): Promise<ServiceResult<Contract>> {
    return apiCall<Contract>(`/api/contracts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  },

  async updateStatus(id: string, status: ContractStatus): Promise<ServiceResult<Contract>> {
    return apiCall<Contract>(`/api/contracts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  },

  async archive(id: string): Promise<ServiceResult<boolean>> {
    const res = await apiCall<unknown>(`/api/contracts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: true }),
    });
    if (res.error) return { data: null, error: res.error };
    return { data: true, error: null };
  },

  async unarchive(id: string): Promise<ServiceResult<boolean>> {
    const res = await apiCall<unknown>(`/api/contracts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: false }),
    });
    if (res.error) return { data: null, error: res.error };
    return { data: true, error: null };
  },

  async delete(id: string): Promise<ServiceResult<boolean>> {
    const res = await apiCall<unknown>(`/api/contracts/${id}`, {
      method: 'DELETE',
    });
    if (res.error) return { data: null, error: res.error };
    return { data: true, error: null };
  },
};
