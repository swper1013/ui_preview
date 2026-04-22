(() => {
    const previewState = window.cameraDashboardPreviewState;
    const deviceButtons = Array.from(document.querySelectorAll('[data-device-button]'));
    const title = document.getElementById('cameraViewerTitle');
    const subtitle = document.getElementById('cameraViewerSubtitle');
    const configuredStatus = document.getElementById('cameraConfiguredStatus');
    const playerStatus = document.getElementById('cameraPlayerStatus');
    const resultBox = document.getElementById('cameraResultBox');
    const videoPlayer = document.getElementById('cameraVideoPlayer');
    const videoPlaceholder = document.getElementById('cameraVideoPlaceholder');
    const settingsForm = document.getElementById('cameraSettingsForm');
    const settingsDeviceId = document.getElementById('cameraSettingsDeviceId');
    const settingsDeviceName = document.getElementById('cameraSettingsDeviceName');
    const settingsEnabled = document.getElementById('cameraSettingsEnabled');
    const settingsLabel = document.getElementById('cameraSettingsLabel');
    const settingsBaseUrl = document.getElementById('cameraSettingsBaseUrl');
    const snapshotButton = document.getElementById('cameraSnapshotButton');
    const snapshotStatus = document.getElementById('cameraSnapshotStatus');
    const snapshotImage = document.getElementById('cameraSnapshotImage');
    const snapshotPlaceholder = document.getElementById('cameraSnapshotPlaceholder');
    const ptzStatus = document.getElementById('cameraPtzStatus');
    const ptzButtons = Array.from(document.querySelectorAll('[data-ptz-command]'));
    const summaryTotal = document.getElementById('cameraSummaryTotal');
    const summaryConfigured = document.getElementById('cameraSummaryConfigured');
    const summaryUnconfigured = document.getElementById('cameraSummaryUnconfigured');

    if (!previewState || !Array.isArray(previewState.devices) || deviceButtons.length === 0 || !title || !subtitle || !configuredStatus || !playerStatus || !resultBox || !settingsForm || !settingsDeviceId || !settingsDeviceName || !settingsEnabled || !settingsLabel || !settingsBaseUrl || !snapshotButton || !snapshotStatus || !snapshotImage || !snapshotPlaceholder || !ptzStatus) {
        return;
    }

    const devices = previewState.devices.map((device) => ({
        ...device
    }));

    let activeDeviceId = null;
    let activeSnapshotUrl = null;

    function findDevice(deviceId) {
        return devices.find((device) => String(device.id) === String(deviceId)) || null;
    }

    function isConfigured(device) {
        return Boolean(device && device.cameraEnabled && device.cameraBaseUrl);
    }

    function getSelectedButton(deviceId) {
        return deviceButtons.find((button) => String(button.dataset.deviceId) === String(deviceId)) || null;
    }

    function syncSummary() {
        const configuredCount = devices.filter((device) => isConfigured(device)).length;
        if (summaryTotal) {
            summaryTotal.textContent = String(devices.length);
        }
        if (summaryConfigured) {
            summaryConfigured.textContent = String(configuredCount);
        }
        if (summaryUnconfigured) {
            summaryUnconfigured.textContent = String(devices.length - configuredCount);
        }
    }

    function setControlsEnabled(enabled) {
        snapshotButton.disabled = !enabled;
        ptzButtons.forEach((button) => {
            button.disabled = !enabled;
        });
    }

    function releaseSnapshot() {
        if (activeSnapshotUrl) {
            URL.revokeObjectURL(activeSnapshotUrl);
            activeSnapshotUrl = null;
        }
    }

    function resetSnapshot(message) {
        releaseSnapshot();
        snapshotImage.removeAttribute('src');
        snapshotImage.classList.add('is-hidden');
        snapshotPlaceholder.classList.remove('is-hidden');
        snapshotPlaceholder.textContent = message;
    }

    function buildSnapshotDataUrl(device) {
        const safeTitle = (device.snapshotTitle || device.cameraName || device.name).replace(/&/g, '&amp;').replace(/</g, '&lt;');
        const safeCaption = (device.snapshotCaption || device.address).replace(/&/g, '&amp;').replace(/</g, '&lt;');
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
                <defs>
                    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stop-color="#091725"/>
                        <stop offset="55%" stop-color="#11324c"/>
                        <stop offset="100%" stop-color="#0c1422"/>
                    </linearGradient>
                </defs>
                <rect width="960" height="540" fill="url(#bg)"/>
                <circle cx="748" cy="132" r="108" fill="rgba(58,199,196,0.14)"/>
                <circle cx="214" cy="398" r="150" fill="rgba(255,182,92,0.12)"/>
                <rect x="46" y="44" width="868" height="452" rx="28" fill="rgba(7,17,29,0.42)" stroke="rgba(154,193,220,0.18)"/>
                <text x="70" y="108" fill="#eff6ff" font-size="34" font-family="Segoe UI, Pretendard, sans-serif" font-weight="700">${safeTitle}</text>
                <text x="70" y="152" fill="#9bb0c4" font-size="18" font-family="Segoe UI, Pretendard, sans-serif">${safeCaption}</text>
                <text x="70" y="454" fill="#3ac7c4" font-size="16" font-family="Segoe UI, Pretendard, sans-serif" letter-spacing="3">MOCK SNAPSHOT</text>
                <text x="70" y="482" fill="#eff6ff" font-size="20" font-family="Segoe UI, Pretendard, sans-serif">2026-04-22 14:20:00</text>
            </svg>
        `.trim();
        return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
    }

    function updateButtonPresentation(button, device) {
        if (!button || !device) {
            return;
        }
        button.dataset.cameraName = device.cameraName || device.name;
        button.dataset.cameraLabel = device.cameraLabel || '';
        button.dataset.cameraEnabled = String(Boolean(device.cameraEnabled));
        button.dataset.cameraBaseUrl = device.cameraBaseUrl || '';
        button.dataset.cameraConfigured = String(isConfigured(device));

        const statusChip = button.querySelector('.status-chip');
        if (statusChip) {
            statusChip.textContent = isConfigured(device) ? '카메라 연결' : '미설정';
            statusChip.classList.toggle('status-chip--running', isConfigured(device));
            statusChip.classList.toggle('status-chip--idle', !isConfigured(device));
        }

        const urlLabel = button.querySelector('small');
        if (urlLabel) {
            urlLabel.textContent = device.cameraBaseUrl || '카메라 기본 URL이 설정되지 않았습니다.';
        }
    }

    function setActiveButton(deviceId) {
        deviceButtons.forEach((button) => {
            button.classList.toggle('is-active', String(button.dataset.deviceId) === String(deviceId));
        });
    }

    function renderResult(payload) {
        resultBox.textContent = JSON.stringify(payload, null, 2);
    }

    function renderDevice(device) {
        const configured = isConfigured(device);
        activeDeviceId = device?.id || null;

        title.textContent = device ? (device.cameraName || device.name) : '장치를 선택하세요';
        subtitle.textContent = device ? device.address : '카메라가 설정된 장치를 선택하면 실시간 영상을 불러옵니다.';
        configuredStatus.textContent = configured ? '카메라 사용' : '미설정';
        configuredStatus.classList.toggle('status-chip--running', configured);
        configuredStatus.classList.toggle('status-chip--idle', !configured);

        settingsDeviceId.value = device?.id || '';
        settingsDeviceName.value = device?.name || '';
        settingsEnabled.checked = Boolean(device?.cameraEnabled);
        settingsLabel.value = device?.cameraLabel || '';
        settingsBaseUrl.value = device?.cameraBaseUrl || '';

        if (!device) {
            playerStatus.textContent = '아직 장치를 선택하지 않았습니다.';
            snapshotStatus.textContent = '장치를 선택하면 현재 프레임 이미지를 요청할 수 있습니다.';
            ptzStatus.textContent = '장치를 선택하면 방향 및 줌 제어를 전송할 수 있습니다.';
            renderResult({message: '아직 요청하지 않았습니다.'});
            setControlsEnabled(false);
            resetSnapshot('아직 가져온 스냅샷이 없습니다.');
            return;
        }

        if (!configured) {
            playerStatus.textContent = '이 장치는 카메라 기본 URL이 설정되지 않았습니다.';
            snapshotStatus.textContent = '카메라 설정이 완료된 장치에서만 스냅샷을 요청할 수 있습니다.';
            ptzStatus.textContent = '카메라 설정이 완료된 장치에서만 PTZ 제어를 사용할 수 있습니다.';
            videoPlayer.classList.add('is-hidden');
            videoPlaceholder.classList.remove('is-hidden');
            videoPlaceholder.innerHTML = '<strong>카메라 설정이 필요합니다.</strong><p>기본 URL과 사용 여부를 저장하면 mock 세션 응답을 확인할 수 있습니다.</p>';
            renderResult({
                deviceId: device.id,
                deviceName: device.name,
                cameraConfigured: false,
                cameraBaseUrl: null
            });
            setControlsEnabled(false);
            resetSnapshot('카메라 설정이 완료된 장치에서만 스냅샷을 표시합니다.');
            return;
        }

        videoPlayer.classList.add('is-hidden');
        videoPlaceholder.classList.remove('is-hidden');
        videoPlaceholder.innerHTML = `<strong>${device.cameraName || device.name} 프리뷰 세션 연결 완료</strong><p>${device.cameraBaseUrl} 기준 mock HLS 응답을 표시합니다.</p>`;
        playerStatus.textContent = `${device.cameraName || device.name} mock 세션이 준비되었습니다.`;
        snapshotStatus.textContent = `${device.cameraName || device.name} 현재 프레임 이미지를 요청할 수 있습니다.`;
        ptzStatus.textContent = `${device.cameraName || device.name} PTZ 제어를 사용할 수 있습니다.`;
        renderResult({
            deviceId: device.id,
            deviceName: device.name,
            cameraConfigured: true,
            cameraBaseUrl: device.cameraBaseUrl,
            ...device.sessionResponse
        });
        setControlsEnabled(true);
        resetSnapshot('스냅샷 요청 버튼으로 현재 프레임을 가져오세요.');
    }

    function openDevice(deviceId) {
        const device = findDevice(deviceId);
        if (!device) {
            return;
        }
        setActiveButton(deviceId);
        renderDevice(device);
    }

    function saveSettings(event) {
        event.preventDefault();
        const device = findDevice(settingsDeviceId.value);
        if (!device) {
            return;
        }

        device.cameraEnabled = settingsEnabled.checked;
        device.cameraLabel = settingsLabel.value.trim();
        device.cameraName = device.cameraLabel || `${device.name} CCTV`;
        device.cameraBaseUrl = settingsBaseUrl.value.trim();
        device.sessionResponse = isConfigured(device)
            ? {
                success: true,
                viewerId: `mock-${device.id}`,
                hlsReady: true,
                hlsUrl: `mock://${device.name}/live.m3u8`,
                cameraResponse: {
                    message: 'Mock camera session connected'
                }
            }
            : {
                success: false,
                message: '카메라 기본 URL이 설정되지 않았습니다.'
            };

        const activeButton = getSelectedButton(device.id);
        updateButtonPresentation(activeButton, device);
        syncSummary();
        renderDevice(device);
        playerStatus.textContent = `${device.name} 설정을 프리뷰 상태에 반영했습니다.`;
    }

    function requestSnapshot() {
        const device = findDevice(activeDeviceId);
        if (!device || !isConfigured(device)) {
            snapshotStatus.textContent = '먼저 카메라가 설정된 장치를 선택하세요.';
            return;
        }

        activeSnapshotUrl = buildSnapshotDataUrl(device);
        snapshotImage.src = activeSnapshotUrl;
        snapshotImage.classList.remove('is-hidden');
        snapshotPlaceholder.classList.add('is-hidden');
        snapshotStatus.textContent = `${device.name} mock 스냅샷을 표시했습니다.`;
    }

    function sendPtz(command) {
        const device = findDevice(activeDeviceId);
        if (!device || !isConfigured(device)) {
            ptzStatus.textContent = '먼저 카메라가 설정된 장치를 선택하세요.';
            return;
        }

        ptzStatus.textContent = `PTZ 명령 완료: ${command}`;
        renderResult({
            success: true,
            deviceId: device.id,
            command,
            message: 'Mock PTZ command accepted'
        });
    }

    deviceButtons.forEach((button) => {
        button.addEventListener('click', () => {
            openDevice(button.dataset.deviceId);
        });
    });

    settingsForm.addEventListener('submit', saveSettings);
    snapshotButton.addEventListener('click', requestSnapshot);
    ptzButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const command = button.dataset.ptzCommand;
            if (command) {
                sendPtz(command);
            }
        });
    });

    syncSummary();
    const initialDeviceId = window.cameraDashboardInitialState?.selectedDeviceId || devices[0]?.id;
    openDevice(initialDeviceId);
})();
