import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import "./index.css";

function App() {
  useEffect(() => {
    // ==============================================================
    //  ① 禁止所有页面上的右键菜单（明确要求）
    // ==============================================================
    const onContextMenu = (e: MouseEvent) => e.preventDefault();
    window.addEventListener("contextmenu", onContextMenu);

    // ==============================================================
    //  ② 禁止浏览器级缩放（增强：配合 App 质感，防止用户误触 Ctrl+滚轮/快捷键
    //     如果以后想恢复，删掉这一块即可，不影响"禁右键/禁外层滚动"的核心功能）
    // ==============================================================
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) e.preventDefault();
    };
    const onKeydown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      switch (e.key) {
        case "+":
        case "=":
        case "-":
        case "_":
        case "0":
          e.preventDefault();
          break;
      }
    };
    const onGestureStart = (e: Event) => e.preventDefault();

    // Wheel/手势必须 { passive:false } 才能 preventDefault（经验 1543684）
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeydown);
    window.addEventListener("gesturestart", onGestureStart); // Safari/iPad pinch

    return () => {
      window.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeydown);
      window.removeEventListener("gesturestart", onGestureStart);
    };
  }, []);

  return <RouterProvider router={router} />;
}

export default App;
