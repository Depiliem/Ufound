import { useEffect, useRef, useState } from "react";
import NfcManager, { NfcEvents, TagEvent } from "react-native-nfc-manager";

type NfcStatus = "idle" | "scanning" | "success" | "error" | "unsupported";

export function useNfc() {
  const [status, setStatus] = useState<NfcStatus>("idle");
  const [uid, setUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isStarted = useRef(false);

  // Format UID bytes to hex string, e.g. "04:AB:12:CD"
  const formatUid = (bytes: number[]): string =>
    bytes.map((b) => b.toString(16).toUpperCase().padStart(2, "0")).join(":");

  const startScan = async (): Promise<string | null> => {
    try {
      // Check if NFC is supported
      const supported = await NfcManager.isSupported();
      if (!supported) {
        setStatus("unsupported");
        setError("Perangkat ini tidak mendukung NFC.");
        return null;
      }

      // Check if NFC is enabled
      const enabled = await NfcManager.isEnabled();
      if (!enabled) {
        setStatus("error");
        setError("NFC tidak aktif. Aktifkan NFC di pengaturan perangkat.");
        return null;
      }

      if (!isStarted.current) {
        await NfcManager.start();
        isStarted.current = true;
      }

      setStatus("scanning");
      setUid(null);
      setError(null);

      return new Promise((resolve) => {
        NfcManager.setEventListener(NfcEvents.DiscoverTag, (tag: TagEvent) => {
          const rawId = tag.id;
          let formatted = "";

          if (typeof rawId === "string") {
            // Some platforms return hex string directly
            formatted = rawId.match(/.{1,2}/g)?.join(":").toUpperCase() ?? rawId;
          } else if (Array.isArray(rawId)) {
            formatted = formatUid(rawId as number[]);
          }

          setUid(formatted);
          setStatus("success");
          NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
          NfcManager.unregisterTagEvent().catch(() => {});
          resolve(formatted);
        });

        NfcManager.registerTagEvent().catch((err) => {
          setStatus("error");
          setError("Gagal mengaktifkan pembaca NFC.");
          resolve(null);
        });
      });
    } catch (err: any) {
      setStatus("error");
      setError(err?.message ?? "Terjadi kesalahan NFC.");
      return null;
    }
  };

  const cancelScan = async () => {
    try {
      NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
      await NfcManager.unregisterTagEvent();
    } catch {}
    setStatus("idle");
  };

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
      NfcManager.unregisterTagEvent().catch(() => {});
    };
  }, []);

  return { status, uid, error, startScan, cancelScan };
}
