import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type AttendanceRecord = {
  student_id: string;
  students: {
    full_name: string;
  } | null;
};

type GuardianContact = {
  student_id: string;
  phone_e164: string | null;
};

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Origin': '*',
};

function toFast2SmsNumber(phone: string | null) {
  if (!phone) {
    return null;
  }

  const digits = phone.replace(/\D/g, '');

  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }

  if (digits.length === 10) {
    return digits;
  }

  return null;
}

function buildAbsentMessage(studentName: string, subjectName: string) {
  return `Dear Parent, ${studentName} WAS ABSENT ON ${subjectName} - VDC - Cloudflex Technologies`;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const fast2SmsApiKey = Deno.env.get('FAST2SMS_API_KEY');
    const fast2SmsSenderId = Deno.env.get('FAST2SMS_SENDER_ID');
    const fast2SmsMessageId = Deno.env.get('FAST2SMS_MESSAGE_ID');

    if (
      !supabaseUrl ||
      !supabaseAnonKey ||
      !supabaseServiceRoleKey ||
      !fast2SmsApiKey ||
      !fast2SmsSenderId ||
      !fast2SmsMessageId
    ) {
      throw new Error('SMS function is missing required environment variables.');
    }

    const authHeader = request.headers.get('Authorization');

    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const { sessionId } = await request.json();

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Missing attendance session id.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid teacher session.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: attendanceSession, error: sessionError } = await serviceClient
      .from('attendance_sessions')
      .select('id, created_by, subject_name')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessionError || !attendanceSession) {
      return new Response(JSON.stringify({ error: sessionError?.message ?? 'Attendance session not found.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    if (attendanceSession.created_by !== user.id) {
      return new Response(JSON.stringify({ error: 'Only the teacher who submitted attendance can send SMS.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    if (!attendanceSession.subject_name) {
      throw new Error('Attendance session does not have a subject.');
    }

    const { data: absentRecords, error: recordsError } = await serviceClient
      .from('attendance_records')
      .select('student_id, students(full_name)')
      .eq('session_id', sessionId)
      .eq('status', 'absent');

    if (recordsError) {
      throw new Error(recordsError.message);
    }

    const records = (absentRecords ?? []) as AttendanceRecord[];

    if (records.length === 0) {
      return new Response(JSON.stringify({ sent: 0, skipped: 0, message: 'No absent students.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const studentIds = records.map((record) => record.student_id);
    const { data: guardians, error: guardiansError } = await serviceClient
      .from('guardian_contacts')
      .select('student_id, phone_e164')
      .in('student_id', studentIds);

    if (guardiansError) {
      throw new Error(guardiansError.message);
    }

    const phoneByStudentId = new Map(
      ((guardians ?? []) as GuardianContact[]).map((guardian) => [
        guardian.student_id,
        guardian.phone_e164,
      ]),
    );

    let sent = 0;
    let skipped = 0;
    const failures: string[] = [];

    for (const record of records) {
      const studentName = record.students?.full_name ?? 'Student';
      const phone = phoneByStudentId.get(record.student_id) ?? null;
      const smsNumber = toFast2SmsNumber(phone);
      const messageText = buildAbsentMessage(studentName, attendanceSession.subject_name);

      if (!smsNumber) {
        skipped += 1;
        await serviceClient.from('sms_logs').insert({
          attendance_session_id: sessionId,
          error_message: 'Missing or invalid guardian phone number.',
          message_text: messageText,
          phone_e164: phone,
          sent_by: user.id,
          status: 'skipped',
          student_id: record.student_id,
        });
        continue;
      }

      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        body: JSON.stringify({
          message: fast2SmsMessageId,
          numbers: smsNumber,
          route: 'dlt',
          sender_id: fast2SmsSenderId,
          variables_values: `${studentName}|${attendanceSession.subject_name}`,
        }),
        headers: {
          Authorization: fast2SmsApiKey,
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });

      const responseJson = await response.json().catch(() => null);
      const wasSent = response.ok && responseJson?.return === true;

      await serviceClient.from('sms_logs').insert({
        attendance_session_id: sessionId,
        error_message: wasSent ? null : JSON.stringify(responseJson),
        message_text: messageText,
        phone_e164: phone,
        provider_request_id: responseJson?.request_id ?? null,
        response: responseJson,
        sent_by: user.id,
        status: wasSent ? 'sent' : 'failed',
        student_id: record.student_id,
      });

      if (wasSent) {
        sent += 1;
      } else {
        failures.push(studentName);
      }
    }

    return new Response(JSON.stringify({ failed: failures.length, failures, sent, skipped }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
