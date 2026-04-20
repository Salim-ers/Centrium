import { createClient } from '@/lib/supabase/client';
import type { Contract, ContractStatus, ServiceResult } from '@/types';
import type { ContractInput } from '@/lib/validators/contract';

function computeEndDate(startDate: string, durationMonths: number): string {
  const d = new Date(startDate);
  d.setMonth(d.getMonth() + durationMonths);
  return d.toISOString().split('T')[0];
}

async function generateContractNumber(organizationId: string): Promise<string> {
  const supabase = createClient();
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from('contracts')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .like('contract_number', `CT-${year}-%`);
  const seq = ((count ?? 0) + 1).toString().padStart(4, '0');
  return `CT-${year}-${seq}`;
}

export const contractService = {
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

  async create(
    input: Omit<ContractInput, 'contract_number'> & { contract_number?: string },
    organizationId: string
  ): Promise<ServiceResult<Contract>> {
    const supabase = createClient();
    const number = input.contract_number ?? (await generateContractNumber(organizationId));
    const end_date = input.end_date ?? computeEndDate(input.start_date, input.duration_months);

    const { data, error } = await supabase
      .from('contracts')
      .insert({
        ...input,
        contract_number: number,
        end_date,
        organization_id: organizationId,
        status: 'draft',
      })
      .select()
      .single();

    if (error) return { data: null, error };

    await supabase.from('activities').insert({
      organization_id: organizationId,
      entity_type: 'contract',
      entity_id: data.id,
      action: 'created',
      metadata: { number },
    });

    return { data: data as Contract, error: null };
  },

  async update(
    id: string,
    input: Partial<ContractInput>
  ): Promise<ServiceResult<Contract>> {
    const supabase = createClient();
    const patch: Record<string, unknown> = { ...input };
    if (input.start_date && input.duration_months) {
      patch.end_date = computeEndDate(input.start_date, input.duration_months);
    }
    const { data, error } = await supabase
      .from('contracts')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) return { data: null, error };
    return { data: data as Contract, error: null };
  },

  async updateStatus(id: string, status: ContractStatus): Promise<ServiceResult<Contract>> {
    const supabase = createClient();
    const patch: Record<string, unknown> = { status };
    if (status === 'signed') patch.signed_at = new Date().toISOString();
    const { data, error } = await supabase
      .from('contracts')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) return { data: null, error };
    return { data: data as Contract, error: null };
  },

  async archive(id: string): Promise<ServiceResult<boolean>> {
    const supabase = createClient();
    const { error } = await supabase.from('contracts').update({ archived: true }).eq('id', id);
    if (error) return { data: null, error };
    return { data: true, error: null };
  },

  async unarchive(id: string): Promise<ServiceResult<boolean>> {
    const supabase = createClient();
    const { error } = await supabase.from('contracts').update({ archived: false }).eq('id', id);
    if (error) return { data: null, error };
    return { data: true, error: null };
  },

  async delete(id: string): Promise<ServiceResult<boolean>> {
    const supabase = createClient();
    const { error } = await supabase.from('contracts').delete().eq('id', id);
    if (error) return { data: null, error };
    return { data: true, error: null };
  },
};
