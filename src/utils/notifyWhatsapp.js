import { getSupabase } from '../api/supabaseClient';

// Fire a WhatsApp notification via the notify-whatsapp edge function.
// Fire-and-forget: never throws into the caller.
export async function sendWhatsApp(text) {
  const supabase = getSupabase();
  if (!supabase || !text) return;
  try {
    await supabase.functions.invoke('notify-whatsapp', { body: { text } });
  } catch (e) {
    console.warn('whatsapp notify failed:', e);
  }
}
