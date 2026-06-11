// supabase/functions/claude-recommend/index.ts 내용
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  // 1. CORS 정책 설정 (앱에서 서버로 통신할 때 차단당하지 않기 위함)
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // 브라우저의 사전 요청(OPTIONS) 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. 앱(클라이언트)에서 보낸 비식별 데이터 받기
    // 예: { interests: ["IT/개발", "창업"], grade: "고등학교 2학년" }
    const { interests, grade } = await req.json()

    // 3. Supabase 금고에 넣어둔 API Key 안전하게 꺼내기
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY")

    if (!anthropicApiKey) {
      throw new Error("Anthropic API Key가 서버에 설정되어 있지 않습니다.")
    }

    // 4. Claude API 서버로 요청 보내기 (Fetch API 사용)
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20260229", // 추천에 가장 우수한 최신 모델
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: `관심사: ${interests.join(", ")}, 학년: ${grade}인 청소년에게 어울리는 대외활동/공모전 추천 가이드를 간결한 한 줄 큐레이션으로 만들어 줘.`
          }
        ]
      })
    })

    const data = await response.json()
    const recommendText = data.content[0].text

    // 5. 성공 결과를 앱으로 리턴
    return new Response(
      JSON.stringify({ recommend: recommendText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    )
  }
})