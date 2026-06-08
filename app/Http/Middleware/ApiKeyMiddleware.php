<?php
/**
 * app/Http/Middleware/ApiKeyMiddleware.php — FreshLink ERP
 * ─────────────────────────────────────────────────────────────
 * Vérifie la clé API envoyée par VitaFresh Shop sur chaque
 * requête entrante vers /api/v1/*.
 *
 * Le Shop envoie : X-Api-Key + X-Signature + X-Timestamp
 * Ce middleware valide les trois avant de laisser passer.
 * ─────────────────────────────────────────────────────────────
 */

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class ApiKeyMiddleware
{
    /**
     * Fenêtre de tolérance pour le timestamp (évite les replay attacks).
     * Si X-Timestamp est antérieur à NOW - 5 minutes → rejet.
     */
    private int $timestampToleranceSeconds = 300;

    public function handle(Request $request, Closure $next)
    {
        $apiKey    = $request->header('X-Api-Key');
        $signature = $request->header('X-Signature');
        $timestamp = $request->header('X-Timestamp');

        // ── 1. Présence des headers obligatoires ──────────────
        if (!$apiKey || !$signature || !$timestamp) {
            return response()->json([
                'error' => 'Headers d\'authentification manquants (X-Api-Key, X-Signature, X-Timestamp)',
            ], 401);
        }

        // ── 2. Vérification de la clé API ─────────────────────
        $expectedKey = config('freshlink.api_key');
        if (!hash_equals($expectedKey, $apiKey)) {
            \Log::warning('[ApiKeyMiddleware] Clé API invalide', [
                'ip'  => $request->ip(),
                'url' => $request->fullUrl(),
            ]);
            return response()->json(['error' => 'Clé API invalide'], 403);
        }

        // ── 3. Vérification anti-replay (timestamp) ───────────
        $requestTime = (int) $timestamp;
        $now         = (int) (microtime(true) * 1000); // ms
        $diffSeconds = abs($now - $requestTime) / 1000;

        if ($diffSeconds > $this->timestampToleranceSeconds) {
            return response()->json(['error' => 'Requête expirée (timestamp trop ancien)'], 401);
        }

        // ── 4. Vérification signature HMAC-SHA256 ─────────────
        $rawBody       = $request->getContent();
        $expectedSig   = 'sha256=' . hash_hmac('sha256', "{$timestamp}.{$rawBody}", config('freshlink.api_key'));
        $signatureValid = hash_equals($expectedSig, $signature);

        if (!$signatureValid) {
            \Log::warning('[ApiKeyMiddleware] Signature HMAC invalide', [
                'ip'     => $request->ip(),
                'client' => $request->header('X-Client'),
            ]);
            return response()->json(['error' => 'Signature invalide'], 403);
        }

        // ── 5. Tout est bon — on laisse passer ────────────────
        \Log::debug('[ApiKeyMiddleware] Requête autorisée', [
            'client' => $request->header('X-Client', 'inconnu'),
            'route'  => $request->path(),
        ]);

        return $next($request);
    }
}
