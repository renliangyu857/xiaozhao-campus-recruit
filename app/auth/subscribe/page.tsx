import { Suspense } from "react";
import SubscribeContent from "./SubscribeContent";

export default function SubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-[#07C160] via-[#00B057] to-[#07C160]" />
          <div className="p-8 flex items-center justify-center min-h-[400px]">
            <div className="w-8 h-8 border-2 border-slate-300 border-t-green-500 rounded-full animate-spin" />
          </div>
        </div>
      </div>
    }>
      <SubscribeContent />
    </Suspense>
  );
}
