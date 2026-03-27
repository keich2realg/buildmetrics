import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    const supabaseAdmin = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data: projects, error: fetchErr } = await supabaseAdmin
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    // Let's also check if we can delete the first one!
    let deleteAttempt = null;
    if (projects && projects.length > 0) {
      const target = projects[0].id;
      const { error: delErr } = await supabaseAdmin
        .from('projects')
        .delete()
        .eq('id', target);
      deleteAttempt = delErr ? delErr.message : "Success";
    }

    return NextResponse.json({ projects, fetchErr, deleteAttempt });
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
