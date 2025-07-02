// src/components/dashboard/TwitterIntegration.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Twitter, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

interface TwitterUser {
  id: string;
  username: string;
  name: string;
}

interface TwitterStatus {
  connected: boolean;
  user?: TwitterUser;
  message?: string;
  error?: string;
}

export default function TwitterIntegration() {
  const [status, setStatus] = useState<TwitterStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const searchParams = useSearchParams();

  // Verificar el estado de la conexión al cargar y manejar parámetros de URL
  useEffect(() => {
    // Manejar mensajes de éxito o error de la URL
    const success = searchParams?.get('success');
    const error = searchParams?.get('error');
    const details = searchParams?.get('details');

    if (success === 'twitter_connected') {
      setNotification({
        type: 'success',
        message: 'Twitter account connected successfully!'
      });
      // Limpiar la URL
      window.history.replaceState({}, '', '/dashboard');
    } else if (error) {
      let errorMessage = 'Failed to connect Twitter account';
      
      switch (error) {
        case 'twitter_auth_denied':
          errorMessage = 'Twitter authorization was denied';
          break;
        case 'missing_code':
          errorMessage = 'Authorization code not received';
          break;
        case 'missing_verifier':
          errorMessage = 'Code verifier not found. Please try again';
          break;
        case 'invalid_state':
          errorMessage = 'Invalid state parameter. Please try again';
          break;
        case 'callback_failed':
          errorMessage = details ? decodeURIComponent(details) : 'Callback processing failed';
          break;
        default:
          errorMessage = details ? decodeURIComponent(details) : errorMessage;
      }

      setNotification({
        type: 'error',
        message: errorMessage
      });
      // Limpiar la URL
      window.history.replaceState({}, '', '/dashboard');
    }

    checkTwitterStatus();
  }, [searchParams]);

  // Auto-ocultar notificaciones después de 5 segundos
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const checkTwitterStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/twitter/status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Error checking Twitter status:', error);
      setStatus({
        connected: false,
        error: 'Failed to check connection status',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);
      setNotification(null);

      // Primero hacer un fetch para verificar si hay errores
      const response = await fetch('/api/twitter/auth');

      // Si la respuesta es JSON, significa que hubo un error
      if (response.headers.get('content-type')?.includes('application/json')) {
        const errorData = await response.json();
        console.error('Twitter auth error details:', errorData);
        
        setNotification({
          type: 'error',
          message: `Authentication failed: ${errorData.message || 'Unknown error'}`
        });
        
        // Mostrar detalles adicionales en la consola para debugging
        console.log('Full error environment:', errorData.environment);
        
        setConnecting(false);
        return;
      }

      // Si no es JSON, significa que fue una redirección exitosa
      // Redirigir manualmente a la URL de Twitter
      // Redirigir directamente al endpoint de autenticación
      // El endpoint se encarga de la redirección a Twitter
      window.location.href = '/api/twitter/auth';
      
    } catch (error) {
      console.error('Error connecting to Twitter:', error);
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Connection failed'
      });
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setLoading(true);
      
      // Aquí podrías implementar un endpoint para desconectar
      // Por ahora, simplemente limpiamos las cookies del lado del cliente
      const response = await fetch('/api/twitter/disconnect', {
        method: 'POST',
      });

      if (response.ok) {
        setStatus({ connected: false, message: 'Disconnected from Twitter' });
        setNotification({
          type: 'success',
          message: 'Successfully disconnected from Twitter'
        });
      } else {
        throw new Error('Failed to disconnect');
      }
    } catch (error) {
      console.error('Error disconnecting from Twitter:', error);
      setNotification({
        type: 'error',
        message: 'Failed to disconnect from Twitter'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && !status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Twitter className="h-5 w-5" />
            Twitter Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Checking connection status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Twitter className="h-5 w-5" />
          Twitter Integration
        </CardTitle>
        <CardDescription>
          Connect your Twitter account to enable content publishing and analytics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Notificaciones temporales */}
        {notification && (
          <Alert variant={notification.type === 'error' ? 'destructive' : 'default'}>
            {notification.type === 'error' ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              {notification.message}
            </AlertDescription>
          </Alert>
        )}

        {status?.connected ? (
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Successfully connected to Twitter as{' '}
                <strong>@{status.user?.username}</strong> ({status.user?.name})
              </AlertDescription>
            </Alert>
            
            <div className="flex gap-2">
              <Button 
                onClick={checkTwitterStatus} 
                variant="outline" 
                size="sm"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  'Refresh Status'
                )}
              </Button>
              <Button 
                onClick={handleDisconnect} 
                variant="destructive" 
                size="sm"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  'Disconnect'
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {status?.error && !notification && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {status.error}
                </AlertDescription>
              </Alert>
            )}
            
            {status?.message && !status?.error && !notification && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {status.message}
                </AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={handleConnect} 
              disabled={connecting}
              className="w-full"
            >
              {connecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Twitter className="mr-2 h-4 w-4" />
                  Connect Twitter Account
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}