import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { useSession } from "./store";

export function RealtimeSync() {
  const token = useSession((state) => state.token);
  const client = useQueryClient();
  useEffect(() => {
    if (!token) return;
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
    const socket = io(`${apiUrl.replace(/\/api\/?$/, "")}/events`, {
      auth: { token },
      transports: ["websocket", "polling"],
      withCredentials: true,
    });
    socket.on("hirehub:event", (event: { type?: string }) => {
      if (event.type === "MESSAGE_CREATED") {
        void client.invalidateQueries({ queryKey: ["recruiter", "messages"] });
        void client.invalidateQueries({
          queryKey: ["recruiter", "conversations"],
        });
      }
      void client.invalidateQueries({ queryKey: ["notifications"] });
      void client.invalidateQueries({
        queryKey: ["candidate", "applications"],
      });
    });
    return () => {
      socket.disconnect();
    };
  }, [client, token]);
  return null;
}
