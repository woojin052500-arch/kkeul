// 신고가 들어오면 운영자에게 메일을 보냅니다.
// Supabase Database Webhook(reports 테이블 INSERT)이 이 함수를 호출합니다.
// 설정 방법: docs/report_email_setup.md
//
// 필요한 Secrets (Edge Functions → Secrets)
//   RESEND_API_KEY     Resend(https://resend.com) API 키
//   REPORT_NOTIFY_TO   받을 주소 (예: ceo@telosix.co.kr)
//   REPORT_NOTIFY_FROM 보내는 주소 (Resend에서 인증한 도메인, 예: 끌 신고 <report@telosix.co.kr>)
//   WEBHOOK_SECRET     웹훅 요청 헤더 x-webhook-secret 과 같은 값
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 는 Supabase가 자동으로 넣어 줍니다.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

interface ReportRecord {
  id: string;
  reporter_id: string;
  target_type: "team_post" | "join_request";
  target_id: string;
  reason: string | null;
  created_at: string;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const secret = Deno.env.get("WEBHOOK_SECRET");
  if (!secret || req.headers.get("x-webhook-secret") !== secret) {
    return new Response("unauthorized", { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  const record = payload?.record as ReportRecord | undefined;
  if (payload?.type !== "INSERT" || payload?.table !== "reports" || !record) {
    return new Response("ignored", { status: 200 });
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // 신고된 내용 가져오기 (이미 숨김 처리된 상태)
  let targetLabel = record.target_type === "team_post" ? "팀원 구인글" : "합류 요청";
  let authorName = "(알 수 없음)";
  let authorId = "";
  let content = "(내용을 찾지 못했어요)";
  if (record.target_type === "team_post") {
    const { data } = await admin.from("team_posts").select("user_id, user_name, comment, announcement_id").eq("id", record.target_id).maybeSingle();
    if (data) {
      authorName = data.user_name;
      authorId = data.user_id;
      content = data.comment;
      targetLabel += ` (공고 ${data.announcement_id})`;
    }
  } else {
    const { data } = await admin.from("join_requests").select("user_id, user_name, message, post_id").eq("id", record.target_id).maybeSingle();
    if (data) {
      authorName = data.user_name;
      authorId = data.user_id;
      content = data.message || "(메시지 없음)";
      targetLabel += ` (구인글 ${data.post_id})`;
    }
  }

  const { count } = await admin
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("target_type", record.target_type)
    .eq("target_id", record.target_id);

  const table = record.target_type === "team_post" ? "team_posts" : "join_requests";
  const html = `
    <h2>끌 신고 접수</h2>
    <p>신고된 내용은 이미 <strong>숨김 처리</strong>됐어요. 확인 후 아래 SQL로 조치하세요.</p>
    <table cellpadding="6" style="border-collapse:collapse">
      <tr><td><b>대상</b></td><td>${escapeHtml(targetLabel)}</td></tr>
      <tr><td><b>작성자</b></td><td>${escapeHtml(authorName)} (${escapeHtml(authorId)})</td></tr>
      <tr><td><b>내용</b></td><td>${escapeHtml(content)}</td></tr>
      <tr><td><b>신고 사유</b></td><td>${escapeHtml(record.reason || "(사유 없음)")}</td></tr>
      <tr><td><b>누적 신고</b></td><td>${count ?? 1}건</td></tr>
      <tr><td><b>시각</b></td><td>${escapeHtml(record.created_at)}</td></tr>
    </table>
    <h3>조치 SQL</h3>
    <pre>-- 문제없으면 다시 공개
update public.${table} set is_hidden = false where id = '${record.target_id}';

-- 작성자 이용 정지
insert into public.suspended_users (user_id, reason) values ('${authorId}', '신고 ${record.id}');</pre>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: Deno.env.get("REPORT_NOTIFY_FROM"),
      to: [Deno.env.get("REPORT_NOTIFY_TO")],
      subject: `[끌 신고] ${targetLabel} · ${authorName}`,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("메일 발송 실패:", res.status, text);
    return new Response("mail failed", { status: 502 });
  }
  return new Response("ok", { status: 200 });
});
