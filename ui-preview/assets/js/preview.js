(function () {
    const body = document.body;
    const activePage = body.dataset.page || "";
    const drawerShell = document.querySelector("[data-drawer-shell]");
    const mockLocations = [
        { title: "남용인 제설 제어함", subtitle: "경기 용인시 처인구 남사읍 북리 128-4", x: "127.189214", y: "37.126842" },
        { title: "백암 교차로 장치", subtitle: "경기 용인시 처인구 백암면 백암리 391-2", x: "127.377114", y: "37.159442" },
        { title: "양지 터널 입구", subtitle: "경기 용인시 처인구 양지면 주북리 611", x: "127.285214", y: "37.236918" }
    ];

    function syncBodyModalState() {
        body.classList.toggle("modal-open", Boolean(document.querySelector(".modal.is-open")));
    }

    function closeModal(modal) {
        if (!modal) {
            return;
        }
        modal.classList.remove("is-open");
        if (modal.classList.contains("modal--drawer")) {
            drawerShell?.classList.remove("app-shell--drawer-open");
        }
        syncBodyModalState();
    }

    function openModal(modal) {
        if (!modal) {
            return;
        }
        modal.classList.add("is-open");
        if (modal.classList.contains("modal--drawer")) {
            drawerShell?.classList.add("app-shell--drawer-open");
        }
        syncBodyModalState();
    }

    function setActiveNav() {
        document.querySelectorAll("[data-nav]").forEach((link) => {
            link.classList.toggle("is-active", link.dataset.nav === activePage);
        });
    }

    function bindAlertClose() {
        document.querySelectorAll(".app-alert-pop__close").forEach((button) => {
            button.addEventListener("click", (event) => {
                event.stopPropagation();
                button.closest(".app-alert-pop")?.remove();
            });
        });

        document.querySelectorAll("[data-dismiss-alert]").forEach((card) => {
            card.addEventListener("click", () => card.remove());
        });
    }

    function updateDashboardSelection(device) {
        const mappings = {
            "[data-selected-device-name]": device.deviceName,
            "[data-selected-device-address]": device.deviceAddress,
            "[data-selected-device-mode]": device.deviceMode,
            "[data-selected-device-runtime]": device.deviceRuntime,
            "[data-selected-device-summary]": device.deviceSummary,
            "[data-selected-device-temperature]": device.deviceTemperature,
            "[data-selected-device-humidity]": device.deviceHumidity,
            "[data-selected-device-plc]": device.devicePlc,
            "[data-selected-device-refresh]": device.deviceRefresh
        };

        Object.entries(mappings).forEach(([selector, value]) => {
            document.querySelectorAll(selector).forEach((node) => {
                if (value) {
                    node.textContent = value;
                }
            });
        });

        document.querySelectorAll("[data-device-card]").forEach((card) => {
            card.classList.toggle("is-active", card.dataset.deviceName === device.deviceName);
        });
    }

    function bindModalControls() {
        document.querySelectorAll("[data-close-modal]").forEach((button) => {
            button.addEventListener("click", () => closeModal(button.closest(".modal")));
        });

        document.querySelectorAll("[data-modal-target]").forEach((trigger) => {
            trigger.addEventListener("click", (event) => {
                const modal = document.getElementById(trigger.dataset.modalTarget || "");
                if (!modal) {
                    return;
                }
                event.preventDefault();
                if (trigger.dataset.deviceName) {
                    updateDashboardSelection(trigger.dataset);
                }
                openModal(modal);
            });
        });
    }

    function bindPreviewForms() {
        document.querySelectorAll("form[data-preview-message]").forEach((form) => {
            form.addEventListener("submit", (event) => {
                event.preventDefault();
                window.alert(form.dataset.previewMessage);
            });
        });

        const loginForm = document.querySelector("[data-login-form]");
        if (loginForm) {
            loginForm.addEventListener("submit", (event) => {
                event.preventDefault();
                window.location.href = "dashboard.html";
            });
        }
    }

    function syncForecastPanels(view) {
        document.querySelectorAll("[data-forecast-panel]").forEach((panel) => {
            panel.classList.toggle("is-hidden", panel.dataset.forecastPanel !== view);
        });

        document.querySelectorAll("[data-forecast-view]").forEach((button) => {
            const isActive = button.dataset.forecastView === view;
            button.classList.toggle("is-active", isActive);
            button.classList.toggle("button--ghost", !isActive);
        });
    }

    function bindForecastSwitch() {
        const buttons = document.querySelectorAll("[data-forecast-view]");
        if (buttons.length === 0) {
            return;
        }
        buttons.forEach((button) => {
            button.addEventListener("click", () => syncForecastPanels(button.dataset.forecastView));
        });
        syncForecastPanels("hourly");
    }

    function syncModeButtons(mode) {
        document.querySelectorAll("[data-mode-option]").forEach((button) => {
            const isActive = button.dataset.modeOption === mode;
            const isStop = mode === "STOP" && isActive;
            button.classList.toggle("is-active", isActive);
            button.classList.toggle("button--primary", isActive && !isStop);
            button.classList.toggle("button--danger", isStop);
            button.classList.toggle("button--ghost", !isActive);
        });

        document.querySelectorAll("[data-mode-panel]").forEach((panel) => {
            panel.classList.toggle("is-hidden", panel.dataset.modePanel !== mode.toLowerCase());
        });

        document.getElementById("autoModeOptions")?.classList.toggle("is-hidden", mode !== "AUTO");
        document.getElementById("manualControlActions")?.classList.toggle("is-hidden", mode !== "MANUAL");
        document.getElementById("preheatSettingCard")?.classList.toggle("is-hidden", mode !== "AUTO");
    }

    function bindModeControls() {
        const modeButtons = document.querySelectorAll("[data-mode-option]");
        if (modeButtons.length === 0) {
            return;
        }

        modeButtons.forEach((button) => {
            button.addEventListener("click", () => syncModeButtons(button.dataset.modeOption));
        });

        document.querySelectorAll("[data-manual-state]").forEach((button) => {
            button.addEventListener("click", () => {
                document.querySelectorAll("[data-manual-state]").forEach((node) => {
                    const isActive = node === button;
                    node.classList.toggle("is-active", isActive);
                    node.classList.toggle("button--accent", isActive);
                    node.classList.toggle("button--ghost", !isActive);
                });
            });
        });

        syncModeButtons("AUTO");
    }

    function renderLocationResults(query) {
        const list = document.getElementById("device-address-result-list");
        const queryLabel = document.getElementById("device-address-query");
        const previewLabel = document.getElementById("device-address-preview-label");
        if (!list || !queryLabel) {
            return;
        }

        const keyword = query.trim().toLowerCase();
        const results = mockLocations.filter((item) =>
            item.title.toLowerCase().includes(keyword) || item.subtitle.toLowerCase().includes(keyword)
        );
        const displayItems = results.length > 0 ? results : mockLocations;
        queryLabel.textContent = results.length > 0
            ? "'" + query + "' 검색 결과 " + results.length + "건"
            : "'" + query + "' 검색 결과가 없습니다. 기본 추천 위치를 보여줍니다.";

        list.innerHTML = "";
        displayItems.forEach((item, index) => {
            const row = document.createElement("li");
            row.className = "address-result-item" + (index === 0 ? " is-active" : "");
            row.innerHTML = `
                <div class="address-result-item__content">
                    <strong>${item.title}</strong>
                    <span>${item.subtitle}</span>
                    <small>좌표 ${item.y}, ${item.x}</small>
                </div>
                <button type="button" class="button button--ghost address-result-item__select">선택</button>
            `;

            row.addEventListener("click", () => {
                list.querySelectorAll(".address-result-item").forEach((node) => node.classList.remove("is-active"));
                row.classList.add("is-active");
                if (previewLabel) {
                    previewLabel.textContent = item.subtitle;
                }
            });

            row.querySelector(".address-result-item__select").addEventListener("click", (event) => {
                event.stopPropagation();
                document.getElementById("deviceAddressField").value = item.subtitle;
                document.getElementById("deviceLatitudeField").value = item.y;
                document.getElementById("deviceLongitudeField").value = item.x;
                document.getElementById("deviceAddressSearchInput").value = item.subtitle;
                if (previewLabel) {
                    previewLabel.textContent = item.subtitle;
                }
                closeModal(document.getElementById("device-address-modal"));
            });

            list.appendChild(row);
        });

        if (previewLabel && displayItems[0]) {
            previewLabel.textContent = displayItems[0].subtitle;
        }
    }

    function bindDeviceAddressSearch() {
        const searchButton = document.getElementById("deviceAddressSearchButton");
        const searchInput = document.getElementById("deviceAddressSearchInput");
        const modal = document.getElementById("device-address-modal");
        if (!searchButton || !searchInput || !modal) {
            return;
        }

        const runSearch = () => {
            const query = searchInput.value.trim();
            if (!query) {
                searchInput.focus();
                return;
            }
            renderLocationResults(query);
            openModal(modal);
        };

        searchButton.addEventListener("click", runSearch);
        searchInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                runSearch();
            }
        });
    }

    setActiveNav();
    bindAlertClose();
    bindModalControls();
    bindPreviewForms();
    bindForecastSwitch();
    bindModeControls();
    bindDeviceAddressSearch();
    syncBodyModalState();
})();
