<?php
/**
 * WebhookDispatcher.php — FreshLink ERP
 * ─────────────────────────────────────────────────────────────
 * Expédie les événements ERP vers les clients autorisés :
 *   1. VitaFresh Shop  : shop.vita-core.org
 *   2. Investor Dash   : vitafresh.vita-core.org (dashboard)
 *
 * CLIENTS NON ACTIFS (future expansion) :
 *   - VitaStores : vitastores.vita-core.org (non implanté)
 *   - VitaCore Groupe : groupe.vita-core.org (hors périmètre ERP)
 *
 * Maintenu par : VitaTech — vitatech.vita-core.org
 * ─────────────────────────────────────────────────────────────
 */

namespace App\Services\Webhooks;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\WebhookDelivery;

class WebhookDispatcher
{
    /**
     * Clients actifs uniquement.
     * Ajouter les futurs clients ici lorsqu'ils seront opérationnels.
     */
    private array $activeClients = [
        'vitafresh_shop' => [
            'url'    => null, // chargé depuis .env
            'secret' => null,
            'active' => true,
        ],
        'investor_dashboard' => [
            'url'    => null,
            'secret' => null,
            'active' => true,
        ],
        // 'vitastores' => ['active' => false],   // PAS ENCORE IMPLANTÉ
        // 'vitacore_groupe' => ['active' => false], // HORS PÉRIMÈTRE ERP
    ];

    public function __construct()
    {
        $this->activeClients['vitafresh_shop']['url']          = config('freshlink.webhook_vitafresh_url');
        $this->activeClients['vitafresh_shop']['secret']       = config('freshlink.webhook_vitafresh_secret');
        $this->activeClients['investor_dashboard']['url']      = config('freshlink.webhook_investor_url');
        $this->activeClients['investor_dashboard']['secret']   = config('freshlink.webhook_investor_secret');
    }

    /**
     * Dispatch un événement à tous les clients actifs.
     */
    public function dispatch(string $event, array $data, array $clients = []): void
    {
        $targets = empty($clients)
            ? array_keys($this->activeClients)
            : $clients;

        $payload = [
            'event'     => $event,
            'data'      => $data,
            'timestamp' => now()->toIso8601String(),
            'source'    => 'erp.vita-core.org',
        ];

        foreach ($targets as $clientKey) {
            $client = $this->activeClients[$clientKey] ?? null;

            if (!$client || !$client['active']) {
                Log::debug("[Webhook] Client '{$clientKey}' ignoré (inactif ou inexistant)");
                continue;
            }

            $this->sendToClient($clientKey, $client, $payload);
        }
    }

    private function sendToClient(string $key, array $client, array $payload): void
    {
        $body      = json_encode($payload);
        $signature = 'sha256=' . hash_hmac('sha256', $body, $client['secret']);

        $attempt = 0;
        $maxRetries = 3;

        while ($attempt < $maxRetries) {
            try {
                $response = Http::withHeaders([
                    'Content-Type'    => 'application/json',
                    'X-Signature'     => $signature,
                    'X-Source'        => 'FreshLink/erp.vita-core.org',
                    'X-Event'         => $payload['event'],
                ])->timeout(10)->post($client['url'], $payload);

                if ($response->successful()) {
                    Log::info("[Webhook] '{$payload['event']}' envoyé → {$key}");
                    $this->logDelivery($key, $payload['event'], true, $response->status());
                    return;
                }

                Log::warning("[Webhook] Réponse non-2xx de '{$key}': {$response->status()}");
            } catch (\Exception $e) {
                Log::error("[Webhook] Erreur '{$key}' (tentative " . ($attempt + 1) . "): {$e->getMessage()}");
            }

            $attempt++;
            if ($attempt < $maxRetries) {
                sleep(pow(2, $attempt)); // backoff exponentiel
            }
        }

        $this->logDelivery($key, $payload['event'], false);
        Log::error("[Webhook] Échec définitif pour '{$key}' — Événement: {$payload['event']}");
    }

    private function logDelivery(string $client, string $event, bool $success, int $status = 0): void
    {
        WebhookDelivery::create([
            'client'    => $client,
            'event'     => $event,
            'success'   => $success,
            'http_status' => $status,
            'delivered_at' => now(),
        ]);
    }
}
