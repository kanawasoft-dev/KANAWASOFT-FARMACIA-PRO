/**
 * KANAWA SOFT FARMÁCIA PRO — cliente Supabase (frontend)
 *
 * 1. Substitua os dois valores abaixo pelos dados do projecto Supabase da Farmácia.
 * 2. Use apenas a chave publishable (sb_publishable_...) ou a antiga anon key.
 * 3. NUNCA coloque aqui a secret/service_role key.
 * 4. Active RLS e crie políticas adequadas em todas as tabelas expostas.
 *
 * Inclua no index.html, depois da configuração da aplicação:
 * <script type="module" src="./supabase.js"></script>
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Project Settings → API → Project URL
const SUPABASE_URL = 'https://SEU_PROJECT_REF.supabase.co';

// Project Settings → API Keys → Publishable key (sb_publishable_...)
// Compatibilidade: também pode usar a antiga anon key.
const SUPABASE_PUBLISHABLE_KEY = 'COLOQUE_A_CHAVE_PUBLISHABLE_AQUI';

if (
  !SUPABASE_URL.startsWith('https://') ||
  SUPABASE_URL.includes('SEU_PROJECT_REF') ||
  !SUPABASE_PUBLISHABLE_KEY ||
  SUPABASE_PUBLISHABLE_KEY.includes('COLOQUE_')
) {
  console.warn('[KANAWA SUPABASE] Configure SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY em frontend/supabase.js.');
} else {
  const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });

  // Disponibiliza o cliente aos módulos JS existentes sem criar outro cliente.
  window.KANAWA_SUPABASE = supabase;
  console.info('[KANAWA SUPABASE] Cliente inicializado.');
}

export const getSupabase = () => {
  if (!window.KANAWA_SUPABASE) {
    throw new Error('Supabase não configurado. Verifique frontend/supabase.js.');
  }
  return window.KANAWA_SUPABASE;
};
