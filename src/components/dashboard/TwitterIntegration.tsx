// src/components/dashboard/TwitterIntegration.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Twitter, CheckCircle, AlertCircle, Loader2, Power } from 'lucide-react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { checkTwitterConnection, disconnectTwitter } from '@/app/actions/twitter-actions';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

interface TwitterUser {
  id: string;
  username: string;
  name: string;
  profile_image_url?: string;
}

interface ConnectionStatus {
  isConnected: boolean;
  user?: TwitterUser | null;
  error?: string;
}

export default function TwitterIntegration({ dict }: { dict: any }) {
  const [status, setStatus] = useState<ConnectionStatus>({ isConnected: false, user: null });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const checkConnection = useCallback(async () => {
    setLoading(true);
    try {
      const result = await checkTwitterConnection();
      setStatus(result);
      if (result.error && !result.isConnected) {
        toast({
            variant: "destructive",
            title: dict.connectionError,
            description: result.error,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : dict.unknownError;
      setStatus({ isConnected: false, error: errorMessage });
      toast({
          variant: "destructive",
          title: dict.connectionError,
          description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, [toast, dict]);

  useEffect(() => {
    const success = searchParams.get('twitter_success');
    const error = searchParams.get('twitter_error');

    if (success) {
      toast({
        title: success === 'connected' ? dict.connectSuccess : dict.disconnectSuccess,
      });
      checkConnection();
      router.replace(pathname);
    } else if (error) {
      toast({
        variant: 'destructive',
        title: dict.connectFail,
        description: `Error: ${error}. Please try connecting again.`,
      });
      router.replace(pathname);
    }
    
    checkConnection();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const handleConnect = () => {
    setLoading(true);
    window.location.href = '/api/twitter/auth';
  };

  const handleDisconnect = async () => {
    setLoading(true);
    await disconnectTwitter();
    // Re-check connection after server action is done
    await checkConnection();
    toast({ title: dict.disconnectSuccess });
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          <Twitter className="h-5 w-5 text-primary" />
          {dict.title}
        </CardTitle>
        <CardDescription>
          {dict.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">{dict.checkingStatus}</span>
            </div>
        ) : status?.isConnected && status.user ? (
          <div className="space-y-3">
             <Alert variant="default" className="border-green-500/50 bg-green-500/10">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-foreground">
                    <div className="flex items-center gap-2">
                        {status.user.profile_image_url && (
                            <Image src={status.user.profile_image_url} alt={status.user.name} width={24} height={24} className="rounded-full" />
                        )}
                        <span>{dict.connectedAs.replace('{user}', status.user.username)}</span>
                    </div>
                </AlertDescription>
             </Alert>
            <Button 
                onClick={handleDisconnect} 
                variant="destructive"
                className="w-full"
                disabled={loading}
              >
                <Power className="mr-2 h-4 w-4" />
                {dict.disconnect}
              </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {status?.error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{status.error}</AlertDescription>
                </Alert>
            )}
            <Button onClick={handleConnect} disabled={loading} className="w-full">
                <Twitter className="mr-2 h-4 w-4" />
                {dict.connect}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
