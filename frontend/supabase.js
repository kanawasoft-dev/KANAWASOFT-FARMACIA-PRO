/**
 * KANAWA SOFT FARMÁCIA PRO — cliente Supabase
 * Projeto: KANAWASOFT-FARMACIA-PRO
 * Domínio oficial: https://farmacia.kanawasoft.shop
 *
 * Segurança: apenas publishable key no navegador. Nunca usar service_role/sb_secret.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://nfelunbfnnrceofskofe.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_xho6gIuG9pYm_xy2J_Htvg_Ih613_TN';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

window.KANAWA_SUPABASE = supabase;
console.info('[KANAWA SUPABASE] Cliente inicializado para FARMACIA-PRO.');

export const getSupabase = () => window.KANAWA_SUPABASE;
