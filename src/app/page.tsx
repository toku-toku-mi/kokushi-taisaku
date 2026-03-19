"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type GeneratedQuestion = {
  question: string;
  choices: string[];
  correct: number;
  explanation: string;
};

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [status, setStatus] = useState("接続確認中…");
  const [text, setText] = useState("");
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const init = async () => {
      try {
        // 1) URLハッシュに access_token があれば手動でセッション化
        if (typeof window !== "undefined" && window.location.hash) {
          const hash = window.location.hash.substring(1);
          const params = new URLSearchParams(hash);
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");

          if (access_token && refresh_token) {
            const { error: setSessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });

            if (setSessionError) {
              console.error("setSession error:", setSessionError);
            } else {
              // URLをきれいにする
              window.history.replaceState({}, document.title, "/");
            }
          }
        }

        // 2) 現在のセッションを読む
        const { data: sessionData, error } = await supabase.auth.getSession();

        if (error) {
          console.error(error);
          setStatus("Supabase接続エラー");
        } else {
          setStatus("Supabase接続OK");
        }

        setUser(sessionData.session?.user ?? null);
      } catch (e) {
        console.error(e);
        setStatus("接続確認で例外が発生");
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "http://localhost:3000",
      },
    });

    if (error) {
      alert(`Googleログインに失敗: ${error.message}`);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setQuestions([]);
    setText("");
  };

  const generateQuestions = async () => {
    if (!text.trim()) {
      alert("資料テキストを入力してね");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setQuestions([]);

    try {
      const response = await fetch("/api/generate-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      const rawText = await response.text();

      if (!response.ok) {
        throw new Error(`APIエラー: ${rawText}`);
      }

      const data = JSON.parse(rawText);
      const parsed = JSON.parse(data.result) as GeneratedQuestion[];
      setQuestions(parsed);
    } catch (error: any) {
      console.error("page.tsx error:", error);
      setErrorMessage(error.message || "問題生成に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-4xl font-bold">獣医師になろう</h1>
        <p className="mt-3 text-slate-600">AIとみんなで作る国試対策</p>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">{status}</p>

          {user ? (
            <div className="mt-4 flex flex-col gap-3">
              <p className="text-sm">
                ログイン中：<span className="font-medium">{user.email}</span>
              </p>
              <div>
                <button
                  onClick={handleLogout}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-white"
                >
                  ログアウト
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-white"
            >
              Googleでログイン
            </button>
          )}
        </div>

        {user && (
          <>
            <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">資料を入力</h2>
              <p className="mt-2 text-sm text-slate-600">
                OCR済みテキストや資料の本文を貼り付けてね
              </p>

              <textarea
                rows={10}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="ここに教科書や資料のテキストを貼る"
                className="mt-4 w-full rounded-xl border border-slate-300 p-4 outline-none"
              />

              <button
                onClick={generateQuestions}
                disabled={loading}
                className="mt-4 rounded-xl bg-slate-900 px-5 py-3 text-white disabled:opacity-50"
              >
                {loading ? "問題生成中…" : "問題を生成する"}
              </button>

              {errorMessage && (
                <p className="mt-4 text-sm text-red-600">{errorMessage}</p>
              )}
            </div>

            <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">生成された問題</h2>

              {questions.length === 0 && !loading && (
                <p className="mt-3 text-sm text-slate-500">
                  まだ問題は生成されていません
                </p>
              )}

              <div className="mt-4 space-y-6">
                {questions.map((q, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <p className="font-medium">
                      Q{index + 1}. {q.question}
                    </p>

                    <ul className="mt-3 space-y-2">
                      {q.choices.map((choice, choiceIndex) => (
                        <li
                          key={choiceIndex}
                          className={`rounded-lg px-3 py-2 ${
                            choiceIndex === q.correct
                              ? "bg-green-100"
                              : "bg-slate-100"
                          }`}
                        >
                          {String.fromCharCode(65 + choiceIndex)}. {choice}
                        </li>
                      ))}
                    </ul>

                    <p className="mt-3 text-sm text-slate-700">
                      正解：{String.fromCharCode(65 + q.correct)}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      解説：{q.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
