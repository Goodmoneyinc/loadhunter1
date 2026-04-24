import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface SendToBrokerButtonProps {
  loadId: string;
  currentStatus: string;
  detentionAmount: number;
  onSuccess?: () => void;
  emailEndpoint?: string;
}

interface EmailResponse {
  success?: boolean;
  error?: string;
}

const DEFAULT_FUNCTION_PATH = '/functions/v1/send-detention-email';

export function SendToBrokerButton({
  loadId,
  currentStatus,
  detentionAmount,
  onSuccess,
  emailEndpoint,
}: SendToBrokerButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const canSend = detentionAmount > 0 && currentStatus !== 'billed';

  const handleSend = async () => {
    if (!canSend) return;
    setIsLoading(true);
    setMessage(null);

    try {
      const baseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
      const endpoint = emailEndpoint ?? (baseUrl ? `${baseUrl}${DEFAULT_FUNCTION_PATH}` : null);
      if (!endpoint) {
        throw new Error('Missing email endpoint. Set VITE_SUPABASE_URL or pass emailEndpoint.');
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const emailResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ loadId }),
      });

      const emailResult = (await emailResponse.json()) as EmailResponse;
      if (!emailResponse.ok || !emailResult.success) {
        throw new Error(emailResult.error || 'Failed to send email');
      }

      const { error: updateError } = await supabase
        .from('loads')
        .update({ status: 'billed', detention_emailed_at: new Date().toISOString() })
        .eq('id', loadId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      setMessage({ text: 'Report sent and load marked as billed!', type: 'success' });
      onSuccess?.();
    } catch (err) {
      console.error(err);
      setMessage({
        text: err instanceof Error ? err.message : 'Something went wrong',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  if (!canSend) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => void handleSend()}
        disabled={isLoading}
        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-md transition"
      >
        {isLoading ? 'Sending...' : 'Send to Broker'}
      </button>
      {message && (
        <div className={`mt-2 text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}
