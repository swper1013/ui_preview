(() => {
    const state = window.deviceStatsPageState;
    const startInput = document.getElementById('statsRangeStart');
    const endInput = document.getElementById('statsRangeEnd');
    const metricButtons = Array.from(document.querySelectorAll('[data-stats-metric]'));
    const presetButtons = Array.from(document.querySelectorAll('[data-range-preset]'));
    const mainChart = document.getElementById('statsMainChart');
    const envChart = document.getElementById('statsEnvChart');
    const mainYAxis = document.getElementById('statsMainYAxis');
    const envYAxis = document.getElementById('statsEnvYAxis');
    const mainLegend = document.getElementById('statsMainLegend');
    const envLegend = document.getElementById('statsEnvLegend');
    const mainChartTitle = document.getElementById('statsMainChartTitle');

    if (!state || !startInput || !endInput || metricButtons.length === 0 || !mainChart || !envChart || !mainYAxis || !envYAxis || !mainLegend || !envLegend || !mainChartTitle) {
        return;
    }

    const metricConfig = {
        voltage: {
            title: '상전압 추이',
            unit: 'V',
            series: [
                {key: 'v12', label: 'V12', color: '#48d6d2'},
                {key: 'v23', label: 'V23', color: '#7de08f'},
                {key: 'v31', label: 'V31', color: '#ffb65c'}
            ]
        },
        current: {
            title: '상전류 추이',
            unit: 'A',
            series: [
                {key: 'a1', label: 'A1', color: '#48d6d2'},
                {key: 'a2', label: 'A2', color: '#7de08f'},
                {key: 'a3', label: 'A3', color: '#ff7f7f'}
            ]
        },
        power: {
            title: '유효전력 추이',
            unit: 'W',
            series: [
                {key: 'activePower', label: '유효전력', color: '#64a9ff'}
            ]
        }
    };

    const envConfig = [
        {key: 'fieldTemperature', label: '온도', unit: 'C', color: '#ff9d57', axis: 'left'},
        {key: 'fieldHumidity', label: '습도', unit: '%', color: '#53c7ff', axis: 'right'}
    ];

    let activeMetric = 'voltage';
    let activePreset = '1d';

    function formatForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    function parseDate(value, fallback) {
        if (!value) {
            return fallback;
        }
        const localMatch = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
        const parsed = localMatch
            ? new Date(
                Number(localMatch[1]),
                Number(localMatch[2]) - 1,
                Number(localMatch[3]),
                Number(localMatch[4]),
                Number(localMatch[5]),
                Number(localMatch[6] || 0)
            )
            : new Date(value);
        return Number.isNaN(parsed.getTime()) ? fallback : parsed;
    }

    function floorToHour(date) {
        const normalized = new Date(date.getTime());
        normalized.setMinutes(0, 0, 0);
        return normalized;
    }

    function getSeedTime() {
        return floorToHour(parseDate(state.plcFetchedAt || state.weatherFetchedAt, new Date()));
    }

    function initializeRange() {
        applyPresetRange(activePreset);
    }

    function applyPresetRange(presetKey) {
        const presetHours = {
            '1d': 24,
            '7d': 24 * 7,
            '30d': 24 * 30
        };
        const hours = presetHours[presetKey] || 24;
        const end = getSeedTime();
        const start = floorToHour(new Date(end.getTime() - hours * 60 * 60 * 1000));
        startInput.value = formatForInput(start);
        endInput.value = formatForInput(end);
        activePreset = presetKey in presetHours ? presetKey : null;
    }

    function updatePresetButtons() {
        presetButtons.forEach((button) => {
            const isActive = button.dataset.rangePreset === activePreset;
            button.classList.toggle('is-active', isActive);
            button.classList.toggle('button--ghost', !isActive);
        });
    }

    function clearPresetSelection() {
        activePreset = null;
        updatePresetButtons();
    }

    function getRange() {
        const fallbackEnd = getSeedTime();
        const fallbackStart = floorToHour(new Date(fallbackEnd.getTime() - 24 * 60 * 60 * 1000));
        let start = floorToHour(parseDate(startInput.value, fallbackStart));
        let end = floorToHour(parseDate(endInput.value, fallbackEnd));
        if (start >= end) {
            start = floorToHour(new Date(end.getTime() - 60 * 60 * 1000));
            startInput.value = formatForInput(start);
        }
        endInput.value = formatForInput(end);
        return {start, end};
    }

    function sampleCount(start, end) {
        const diffHours = Math.max(1, Math.round((end.getTime() - start.getTime()) / (60 * 60 * 1000)));
        return diffHours + 1;
    }

    function seededOffset(index, amount) {
        return Math.sin(index * 0.61) * amount + Math.cos(index * 0.19) * amount * 0.5;
    }

    function buildSeriesValues(metric, start, end) {
        const config = metricConfig[metric];
        const count = sampleCount(start, end);
        const timestamps = [];
        const series = config.series.map((entry, seriesIndex) => {
            const baseValue = metric === 'power'
                ? Number((Number(state.activePower || 3200) / 10).toFixed(1))
                : metric === 'voltage'
                    ? Number((Number(state[metric]?.[entry.key] || 0) / 10).toFixed(1))
                    : Number(state[metric]?.[entry.key] || 0);
            const variance = metric === 'voltage' ? 4.5 : metric === 'current' ? 1.4 : 24;
            const values = [];

            for (let index = 0; index < count; index += 1) {
                if (seriesIndex === 0) {
                    timestamps.push(new Date(start.getTime() + index * 60 * 60 * 1000));
                }
                const trend = Math.sin((index / count) * Math.PI * 2 + seriesIndex * 0.8);
                values.push(Math.max(0, Number((baseValue + trend * variance + seededOffset(index + seriesIndex * 5, variance * 0.24)).toFixed(1))));
            }

            return {
                ...entry,
                values
            };
        });

        return {timestamps, series, unit: config.unit, title: config.title};
    }

    function buildEnvironmentValues(start, end) {
        const count = sampleCount(start, end);
        const timestamps = [];
        const baseTemp = Number(state.fieldTemperature ?? -2.3);
        const baseHumidity = Number(state.fieldHumidity ?? 74.5);

        const series = envConfig.map((entry, seriesIndex) => {
            const values = [];
            for (let index = 0; index < count; index += 1) {
                if (seriesIndex === 0) {
                    timestamps.push(new Date(start.getTime() + index * 60 * 60 * 1000));
                }
                if (entry.key === 'fieldTemperature') {
                    values.push(Number((baseTemp + Math.sin(index * 0.22) * 2.4 + seededOffset(index, 0.6)).toFixed(1)));
                } else {
                    values.push(Math.max(0, Math.min(100, Number((baseHumidity + Math.cos(index * 0.17) * 6.5 + seededOffset(index, 1.8)).toFixed(1)))));
                }
            }
            return {
                ...entry,
                values
            };
        });

        return {timestamps, series};
    }

    function createSvg(tag, attrs) {
        const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
        Object.entries(attrs).forEach(([key, value]) => {
            element.setAttribute(key, String(value));
        });
        return element;
    }

    function toPointList(values, xForIndex, yForValue, axis = 'left') {
        return values.map((value, index) => ({
            x: xForIndex(index),
            y: yForValue(value, axis),
            value
        }));
    }

    function buildPolylinePoints(points) {
        return points.map((point) => `${point.x},${point.y}`).join(' ');
    }

    function buildAreaPath(points, bottomY) {
        if (points.length === 0) {
            return '';
        }
        const start = points[0];
        const end = points[points.length - 1];
        const polyline = points.map((point) => `L ${point.x} ${point.y}`).join(' ');
        return `M ${start.x} ${bottomY} ${polyline} L ${end.x} ${bottomY} Z`;
    }

    function formatAxisValue(value) {
        return `${value.toFixed(1)}`;
    }

    function formatTimestamp(date) {
        return `${formatDatePart(date)} ${formatTimePart(date)}`;
    }

    function formatDatePart(date) {
        return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
    }

    function formatTimePart(date) {
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }

    function ensureTooltip(svg) {
        const wrap = svg.parentElement;
        let tooltip = wrap.querySelector('.stats-chart-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.className = 'stats-chart-tooltip is-hidden';
            wrap.append(tooltip);
        }
        return tooltip;
    }

    function resolveChartWidth() {
        return 3940;
    }

    function renderYAxisLabel(container, top, text, className, color) {
        const label = document.createElement('span');
        label.className = className;
        label.style.top = `${top}px`;
        if (color) {
            label.style.color = color;
        }
        label.textContent = text;
        container.append(label);
    }

    function renderYAxisBand(container, top, height, color) {
        const band = document.createElement('div');
        band.className = 'stats-chart-yaxis__band-bg';
        band.style.top = `${top}px`;
        band.style.height = `${height}px`;
        band.style.background = color;
        container.append(band);
    }

    function prepareYAxisContainer(container, height) {
        container.innerHTML = '';
        container.style.height = `${height}px`;
    }

    function resetScrollPosition(svg) {
        const scrollContainer = svg.parentElement;
        if (scrollContainer) {
            scrollContainer.scrollLeft = 0;
        }
    }

    function attachChartHover(svg, model) {
        const tooltip = ensureTooltip(svg);
        const wrap = svg.parentElement;
        let hoverLine = svg.querySelector('.stats-chart__hover-line');
        if (!hoverLine) {
            hoverLine = createSvg('line', {
                class: 'stats-chart__hover-line'
            });
            svg.append(hoverLine);
        }

        const {timestamps, series, padding, plotWidth, top, bottom, valueFormatter} = model;

        function hideTooltip() {
            tooltip.classList.add('is-hidden');
            hoverLine.style.display = 'none';
        }

        function showTooltip(event) {
            const rect = svg.getBoundingClientRect();
            if (!rect.width || !rect.height || timestamps.length === 0) {
                hideTooltip();
                return;
            }

            const viewBox = svg.viewBox.baseVal;
            const svgWidth = viewBox && viewBox.width ? viewBox.width : 920;
            const svgX = ((event.clientX - rect.left) / rect.width) * svgWidth;
            const ratio = (svgX - padding.left) / Math.max(1, plotWidth);
            const index = Math.max(0, Math.min(timestamps.length - 1, Math.round(ratio * (timestamps.length - 1))));
            const x = padding.left + (plotWidth * index) / Math.max(1, timestamps.length - 1);

            hoverLine.setAttribute('x1', String(x));
            hoverLine.setAttribute('x2', String(x));
            hoverLine.setAttribute('y1', String(top));
            hoverLine.setAttribute('y2', String(bottom));
            hoverLine.style.display = 'block';

            tooltip.innerHTML = [
                `<div class="stats-chart-tooltip__time">${formatTimestamp(timestamps[index])}</div>`,
                ...series.map((entry) => {
                    const unit = entry.unit || model.unit || '';
                    return `<div class="stats-chart-tooltip__row">
                        <span class="stats-chart-tooltip__dot" style="background:${entry.color}"></span>
                        <span class="stats-chart-tooltip__label">${entry.label}</span>
                        <strong>${valueFormatter(entry.values[index], unit)}</strong>
                    </div>`;
                })
            ].join('');

            const wrapRect = wrap.getBoundingClientRect();
            const tooltipWidth = tooltip.offsetWidth || 156;
            const tooltipHeight = tooltip.offsetHeight || 80;
            const scrollLeft = wrap.scrollLeft || 0;
            let left = event.clientX - wrapRect.left + scrollLeft + 14;
            let topPos = event.clientY - wrapRect.top - tooltipHeight - 12;

            const minLeft = scrollLeft + 8;
            const maxLeft = scrollLeft + wrap.clientWidth - tooltipWidth - 8;

            if (left > maxLeft) {
                left = maxLeft;
            }
            if (left < minLeft) {
                left = minLeft;
            }
            if (topPos < 8) {
                topPos = 8;
            }

            tooltip.style.left = `${left}px`;
            tooltip.style.top = `${topPos}px`;
            tooltip.classList.remove('is-hidden');
        }

        svg.onmousemove = showTooltip;
        svg.onmouseleave = hideTooltip;
    }

    function renderLegend(container, series, currentSuffixFn) {
        container.innerHTML = '';
        series.forEach((entry) => {
            const item = document.createElement('div');
            item.className = 'stats-chart-legend__item';

            const dot = document.createElement('span');
            dot.className = 'stats-chart-legend__dot';
            dot.style.background = entry.color;

            const label = document.createElement('span');
            label.className = 'stats-chart-legend__label';
            const lastValue = entry.values[entry.values.length - 1];
            label.textContent = `${entry.label} ${currentSuffixFn(entry, lastValue)}`;

            item.append(dot, label);
            container.append(item);
        });
    }

    function renderLineChart(svg, yAxisContainer, chartData, options = {}) {
        const width = resolveChartWidth(chartData.timestamps.length);
        const height = options.height || 280;
        const padding = {top: 16, right: options.rightAxis ? 64 : 24, bottom: 36, left: 2};
        const plotWidth = width - padding.left - padding.right;
        const plotHeight = height - padding.top - padding.bottom;
        const timestamps = chartData.timestamps;
        const allPrimaryValues = chartData.series
            .filter((entry) => !options.dualAxis || entry.axis === 'left')
            .flatMap((entry) => entry.values);
        const leftMin = options.dualAxis
            ? Math.min(...chartData.series.find((entry) => entry.axis === 'left').values)
            : Math.min(...allPrimaryValues);
        const leftMax = options.dualAxis
            ? Math.max(...chartData.series.find((entry) => entry.axis === 'left').values)
            : Math.max(...allPrimaryValues);
        const leftRange = leftMax - leftMin || 1;
        const normalizedLeftMin = leftMin - leftRange * 0.12;
        const normalizedLeftMax = leftMax + leftRange * 0.12;

        let rightMin = 0;
        let rightMax = 1;
        if (options.dualAxis) {
            const rightValues = chartData.series.find((entry) => entry.axis === 'right').values;
            const rightRange = (Math.max(...rightValues) - Math.min(...rightValues)) || 1;
            rightMin = Math.min(...rightValues) - rightRange * 0.12;
            rightMax = Math.max(...rightValues) + rightRange * 0.12;
        }

        const xForIndex = (index) => padding.left + (plotWidth * index) / Math.max(1, timestamps.length - 1);
        const yForValue = (value, axis = 'left') => {
            const min = axis === 'right' ? rightMin : normalizedLeftMin;
            const max = axis === 'right' ? rightMax : normalizedLeftMax;
            const ratio = (value - min) / Math.max(1e-6, max - min);
            return padding.top + plotHeight - ratio * plotHeight;
        };

        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.style.width = `${width}px`;
        svg.style.height = `${height}px`;
        svg.innerHTML = '';
        prepareYAxisContainer(yAxisContainer, height);
        resetScrollPosition(svg);

        const defs = createSvg('defs', {});
        svg.append(defs);

        for (let step = 0; step < 5; step += 1) {
            const y = padding.top + (plotHeight / 4) * step;
            svg.append(createSvg('line', {
                x1: padding.left,
                y1: y,
                x2: width - padding.right,
                y2: y,
                class: 'stats-chart__grid'
            }));
        }

        const verticalGridCount = Math.min(8, Math.max(4, Math.floor(timestamps.length / 24)));
        for (let step = 0; step <= verticalGridCount; step += 1) {
            const ratio = step / verticalGridCount;
            const x = padding.left + plotWidth * ratio;
            svg.append(createSvg('line', {
                x1: x,
                y1: padding.top,
                x2: x,
                y2: padding.top + plotHeight,
                class: 'stats-chart__grid stats-chart__grid--vertical'
            }));
        }

        for (let step = 0; step < 5; step += 1) {
            const value = normalizedLeftMax - ((normalizedLeftMax - normalizedLeftMin) / 4) * step;
            const y = padding.top + (plotHeight / 4) * step;
            renderYAxisLabel(
                yAxisContainer,
                y - 8,
                options.leftLabelFormatter ? options.leftLabelFormatter(value) : formatAxisValue(value),
                'stats-chart-yaxis__label'
            );
        }

        if (options.dualAxis) {
            for (let step = 0; step < 5; step += 1) {
                const value = rightMax - ((rightMax - rightMin) / 4) * step;
                const y = padding.top + (plotHeight / 4) * step;
                const label = createSvg('text', {
                    x: width - padding.right + 12,
                    y: y + 4,
                    'text-anchor': 'start',
                    class: 'stats-chart__axis-label'
                });
                label.textContent = options.rightLabelFormatter ? options.rightLabelFormatter(value) : value.toFixed(1);
                svg.append(label);
            }
        }

        const timeLabelCount = Math.min(10, Math.max(4, Math.floor(timestamps.length / 12) + 1));
        const timeIndexes = Array.from({length: timeLabelCount}, (_, idx) =>
            Math.round(((timestamps.length - 1) * idx) / Math.max(1, timeLabelCount - 1))
        );
        const seen = new Set();
        timeIndexes.forEach((index) => {
            if (seen.has(index)) {
                return;
            }
            seen.add(index);
            const x = xForIndex(index);
            const label = createSvg('text', {
                x,
                y: height - 20,
                'text-anchor': index === 0 ? 'start' : index === timestamps.length - 1 ? 'end' : 'middle',
                class: 'stats-chart__axis-label'
            });
            const date = timestamps[index];
            const dateLine = createSvg('tspan', {x, dy: 0});
            dateLine.textContent = formatDatePart(date);
            const timeLine = createSvg('tspan', {x, dy: 13, class: 'stats-chart__axis-label stats-chart__axis-label--sub'});
            timeLine.textContent = formatTimePart(date);
            label.append(dateLine, timeLine);
            svg.append(label);
        });

        chartData.series.forEach((entry, entryIndex) => {
            const axis = entry.axis || 'left';
            const pointList = toPointList(entry.values, xForIndex, yForValue, axis);
            const gradientId = `${svg.id || 'stats-chart'}-gradient-${entryIndex}`;
            const gradient = createSvg('linearGradient', {
                id: gradientId,
                x1: '0%',
                y1: '0%',
                x2: '0%',
                y2: '100%'
            });
            gradient.append(createSvg('stop', {
                offset: '0%',
                'stop-color': entry.color,
                'stop-opacity': options.dualAxis ? 0.18 : 0.24
            }));
            gradient.append(createSvg('stop', {
                offset: '100%',
                'stop-color': entry.color,
                'stop-opacity': '0'
            }));
            defs.append(gradient);

            svg.append(createSvg('path', {
                d: buildAreaPath(pointList, padding.top + plotHeight),
                fill: `url(#${gradientId})`,
                class: 'stats-chart__area'
            }));

            svg.append(createSvg('polyline', {
                points: buildPolylinePoints(pointList),
                fill: 'none',
                stroke: entry.color,
                'stroke-width': axis === 'right' ? 1.2 : 1.4,
                'stroke-linejoin': 'round',
                'stroke-linecap': 'round',
                class: 'stats-chart__line'
            }));

            const lastIndex = entry.values.length - 1;
            const lastPoint = pointList[lastIndex];
            svg.append(createSvg('line', {
                x1: lastPoint.x,
                y1: padding.top,
                x2: lastPoint.x,
                y2: padding.top + plotHeight,
                class: 'stats-chart__marker-line'
            }));
            svg.append(createSvg('circle', {
                cx: lastPoint.x,
                cy: lastPoint.y,
                r: 4,
                fill: entry.color,
                class: 'stats-chart__point'
            }));
        });

        attachChartHover(svg, {
            timestamps,
            series: chartData.series,
            padding,
            plotWidth,
            top: padding.top,
            bottom: padding.top + plotHeight,
            unit: options.unit || '',
            valueFormatter: (value, unit) => `${formatAxisValue(value)} ${unit}`.trim()
        });
    }

    function renderBandChart(svg, yAxisContainer, chartData, options = {}) {
        const width = resolveChartWidth(chartData.timestamps.length);
        const height = options.height || 300;
        const padding = {top: 16, right: 20, bottom: 36, left: 2};
        const plotWidth = width - padding.left - padding.right;
        const plotHeight = height - padding.top - padding.bottom;
        const timestamps = chartData.timestamps;
        const bandGap = 12;
        const bandHeight = (plotHeight - bandGap * Math.max(0, chartData.series.length - 1)) / Math.max(1, chartData.series.length);

        const xForIndex = (index) => padding.left + (plotWidth * index) / Math.max(1, timestamps.length - 1);

        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.style.width = `${width}px`;
        svg.style.height = `${height}px`;
        svg.innerHTML = '';
        prepareYAxisContainer(yAxisContainer, height);
        resetScrollPosition(svg);

        const defs = createSvg('defs', {});
        svg.append(defs);

        const verticalGridCount = Math.min(8, Math.max(4, Math.floor(timestamps.length / 24)));
        for (let step = 0; step <= verticalGridCount; step += 1) {
            const ratio = step / verticalGridCount;
            const x = padding.left + plotWidth * ratio;
            svg.append(createSvg('line', {
                x1: x,
                y1: padding.top,
                x2: x,
                y2: padding.top + plotHeight,
                class: 'stats-chart__grid stats-chart__grid--vertical'
            }));
        }

        chartData.series.forEach((entry, entryIndex) => {
            const top = padding.top + entryIndex * (bandHeight + bandGap);
            const bottom = top + bandHeight;
            const seriesMin = Math.min(...entry.values);
            const seriesMax = Math.max(...entry.values);
            const seriesRange = Math.max(1e-6, seriesMax - seriesMin || 1);
            const normalizedMin = seriesMin - seriesRange * 0.16;
            const normalizedMax = seriesMax + seriesRange * 0.16;
            const yForValue = (value) => {
                const ratio = (value - normalizedMin) / Math.max(1e-6, normalizedMax - normalizedMin);
                return bottom - ratio * bandHeight;
            };

            if (entryIndex > 0) {
                svg.append(createSvg('line', {
                    x1: padding.left,
                    y1: top - bandGap / 2,
                    x2: width - padding.right,
                    y2: top - bandGap / 2,
                    class: 'stats-chart__band-divider'
                }));
            }

            renderYAxisBand(yAxisContainer, top, bandHeight, entry.color);
            svg.append(createSvg('rect', {
                x: padding.left,
                y: top,
                width: plotWidth,
                height: bandHeight,
                rx: 8,
                fill: entry.color,
                'fill-opacity': 0.03,
                class: 'stats-chart__band-bg'
            }));

            svg.append(createSvg('line', {
                x1: padding.left,
                y1: top + 8,
                x2: padding.left,
                y2: bottom - 8,
                stroke: entry.color,
                'stroke-width': 2,
                class: 'stats-chart__band-accent'
            }));

            renderYAxisLabel(yAxisContainer, top - 1, entry.label, 'stats-chart-yaxis__band', entry.color);
            renderYAxisLabel(
                yAxisContainer,
                top + 14,
                `${formatAxisValue(entry.values[entry.values.length - 1])} ${options.unit || ''}`.trim(),
                'stats-chart-yaxis__current',
                entry.color
            );
            renderYAxisLabel(yAxisContainer, top + 32, `${formatAxisValue(seriesMax)} ${options.unit || ''}`.trim(), 'stats-chart-yaxis__axis');
            renderYAxisLabel(yAxisContainer, bottom - 12, `${formatAxisValue(seriesMin)} ${options.unit || ''}`.trim(), 'stats-chart-yaxis__axis');

            const pointList = toPointList(entry.values, xForIndex, yForValue);
            const gradientId = `${svg.id || 'stats-chart'}-band-gradient-${entryIndex}`;
            const gradient = createSvg('linearGradient', {
                id: gradientId,
                x1: '0%',
                y1: '0%',
                x2: '0%',
                y2: '100%'
            });
            gradient.append(createSvg('stop', {
                offset: '0%',
                'stop-color': entry.color,
                'stop-opacity': 0.22
            }));
            gradient.append(createSvg('stop', {
                offset: '100%',
                'stop-color': entry.color,
                'stop-opacity': '0'
            }));
            defs.append(gradient);

            svg.append(createSvg('path', {
                d: buildAreaPath(pointList, bottom),
                fill: `url(#${gradientId})`,
                class: 'stats-chart__area'
            }));

            svg.append(createSvg('polyline', {
                points: buildPolylinePoints(pointList),
                fill: 'none',
                stroke: entry.color,
                'stroke-width': 1.3,
                'stroke-linejoin': 'round',
                'stroke-linecap': 'round',
                class: 'stats-chart__line'
            }));

            const lastPoint = pointList[pointList.length - 1];
            svg.append(createSvg('circle', {
                cx: lastPoint.x,
                cy: lastPoint.y,
                r: 4,
                fill: entry.color,
                class: 'stats-chart__point'
            }));
        });

        const timeLabelCount = Math.min(10, Math.max(4, Math.floor(timestamps.length / 12) + 1));
        const timeIndexes = Array.from({length: timeLabelCount}, (_, idx) =>
            Math.round(((timestamps.length - 1) * idx) / Math.max(1, timeLabelCount - 1))
        );
        const seen = new Set();
        timeIndexes.forEach((index) => {
            if (seen.has(index)) {
                return;
            }
            seen.add(index);
            const x = xForIndex(index);
            const label = createSvg('text', {
                x,
                y: height - 20,
                'text-anchor': index === 0 ? 'start' : index === timestamps.length - 1 ? 'end' : 'middle',
                class: 'stats-chart__axis-label'
            });
            const date = timestamps[index];
            const dateLine = createSvg('tspan', {x, dy: 0});
            dateLine.textContent = formatDatePart(date);
            const timeLine = createSvg('tspan', {x, dy: 13, class: 'stats-chart__axis-label stats-chart__axis-label--sub'});
            timeLine.textContent = formatTimePart(date);
            label.append(dateLine, timeLine);
            svg.append(label);
        });

        attachChartHover(svg, {
            timestamps,
            series: chartData.series,
            padding,
            plotWidth,
            top: padding.top,
            bottom: padding.top + plotHeight,
            unit: options.unit || '',
            valueFormatter: (value, unit) => `${formatAxisValue(value)} ${unit}`.trim()
        });
    }

    function updateMetricButtons() {
        metricButtons.forEach((button) => {
            const isActive = button.dataset.statsMetric === activeMetric;
            button.classList.toggle('is-active', isActive);
            button.classList.toggle('button--ghost', !isActive);
        });
    }

    function render() {
        const {start, end} = getRange();
        const mainData = buildSeriesValues(activeMetric, start, end);
        const envData = buildEnvironmentValues(start, end);

        mainChartTitle.textContent = mainData.title;
        renderLegend(mainLegend, mainData.series, (_, value) => `${formatAxisValue(value)} ${mainData.unit}`);
        if (mainData.series.length > 1) {
            renderBandChart(mainChart, mainYAxis, mainData, {
                unit: mainData.unit
            });
        } else {
            renderLineChart(mainChart, mainYAxis, mainData, {
                unit: mainData.unit
            });
        }

        renderLegend(envLegend, envData.series, (entry, value) => `${value.toFixed(1)} ${entry.key === 'fieldTemperature' ? 'C' : '%'}`);
        renderLineChart(envChart, envYAxis, envData, {
            height: 240,
            dualAxis: true,
            leftLabelFormatter: (value) => `${value.toFixed(1)} C`,
            rightLabelFormatter: (value) => `${value.toFixed(0)} %`
        });
    }

    initializeRange();
    updateMetricButtons();
    updatePresetButtons();
    render();

    metricButtons.forEach((button) => {
        button.addEventListener('click', () => {
            activeMetric = button.dataset.statsMetric || 'voltage';
            updateMetricButtons();
            render();
        });
    });

    presetButtons.forEach((button) => {
        button.addEventListener('click', () => {
            applyPresetRange(button.dataset.rangePreset || '1d');
            updatePresetButtons();
            render();
        });
    });

    startInput.addEventListener('change', () => {
        clearPresetSelection();
        render();
    });

    endInput.addEventListener('change', () => {
        clearPresetSelection();
        render();
    });
})();
