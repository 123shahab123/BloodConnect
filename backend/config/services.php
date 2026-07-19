<?php
return [
    'fcm' => [
        'project_id'    => env('FCM_PROJECT_ID'),
        'client_email'  => env('FCM_CLIENT_EMAIL'),
        'private_key'   => env('FCM_PRIVATE_KEY'),
        'credentials_file' => env('FCM_CREDENTIALS_FILE', storage_path('app/firebase-credentials.json')),
    ],
];
