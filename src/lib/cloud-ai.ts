import { supabase } from '@/integrations/supabase/client';
import type { Settings } from './trainer';

export const CLOUD_MODEL = 'gemini-3.8-flash';
export function isCloudModel(model: string): boolean {
  return model === CLOUD_MODEL || model === 'gemini-2.5-flash';
}
export function usesCloudAI(settings: Settings): boolean {
  return settings.provider === 'gemini' || (!settings.provider && (!settings.model || isCloudModel(settings.model)));
}
export function modelName(settings: Settings): string {
  return usesCloudAI(settings) ? CLOUD_MODEL : settings.model;
}
const functionUrl = 'https://nqmyjhmxiwzjbwbrmtwu.supabase.co/functions/v1/trainer-ai';
export async function cloudGenerate(system: string, prompt: string, format: object): Promise<unknown> {
  // The SDK adds its own /functions/v1 prefix, so pass the name from the full endpoint.
  const functionName = new URL(functionUrl).pathname.split('/').pop()!;
  const { data, error } = await supabase.functions.invoke(functionName, { body: { system, prompt, format } });
  if (error) {
    let message = 'Online AI sa nepodarilo pripojiť. Skontrolujte internet a serverový kľúč GEMINI_API_KEY v Supabase.';
    if (error.context instanceof Response) {
      try { const detail = await error.context.json(); if (typeof detail.error === 'string') message = detail.error; } catch { /* Network errors may not have a JSON response. */ }
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data?.result;
}
