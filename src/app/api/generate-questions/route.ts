import OpenAI from "openai";
import { NextResponse } from "next/server";

console.log("ENV KEY PREFIX:", process.env.OPENAI_API_KEY?.slice(0, 20));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text = body.text;

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: "テキストが空です" },
        { status: 400 }
      );
    }

    const prompt = `
あなたは獣医学教育に強い問題作成アシスタントです。
以下の資料だけを根拠にして、日本の獣医学生向けの4択問題を3問作成してください。

条件:
- 問題文
- 選択肢4つ
- 正解（0,1,2,3）
- 解説
を含める
- 必ずJSON配列だけを返す
- コードブロックや説明文は不要

出力形式:
[
  {
    "question": "問題文",
    "choices": ["A", "B", "C", "D"],
    "correct": 0,
    "explanation": "解説"
  }
]

資料:
${text}
`;

   const response = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: prompt }],
});
const outputText = response.choices[0].message.content || "[]";


    return NextResponse.json({ result: outputText });
  } catch (error: any) {
    console.error("OpenAI route error:", error);

    return NextResponse.json(
      {
        error: error?.message || "問題生成に失敗しました",
        details: error?.toString?.() || "unknown error",
      },
      { status: 500 }
    );
  }
}
