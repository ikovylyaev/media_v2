---
layout: default
title: kovylyaevmedia repo
---

<!-- Шапка -->
<header class="site-header-main">
  <div class="header-inner-main">
    <div class="logo">
      <a href="/" class="navbar-brand">
        <img src="{{ site.url }}/img/media_dark.svg" style="height: 48px;">
      </a>
    </div>
    <nav class="main-nav">
      <ul>
        <li><a href="/" class="nav-link active">карта</a></li>
        <li><a href="/photo" class="nav-link">фото</a></li>
        <li><a href="/video" class="nav-link">видео</a></li>
      </ul>
    </nav>
  </div>
</header>

<!-- Карта на всю ширину -->
<div class="map-wrapper">
  <div id="map"></div>
</div>

<!-- Контейнер для карточки рядом с маркером -->
<div id="marker-card" class="marker-card"></div>

<!-- Скрытая колонка с карточками -->
<div class="cards-column" style="display: none;">
  <div class="media-list" id="media-list"></div>
</div>

<!-- Leaflet CDN -->
<link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>

<!-- Инициализация карты и маркеров -->
<script>
  document.addEventListener('DOMContentLoaded', function() {
    // Инициализация карты
    const map = L.map('map', {
      zoomControl: false // Отключаем стандартный контроль масштаба
    }).setView([56.8389, 60.6057], 12);

    // Добавление слоя карты без копирайта
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
      attribution: ' ', // Убираем копирайт
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    // Добавление минималистичного контроля масштаба в правый нижний угол
    L.control.zoom({
      position: 'bottomright' // Позиция в правом нижнем углу
    }).addTo(map);


    // Контейнер для карточки
    const markerCard = document.getElementById('marker-card');

    // Загрузка данных
    fetch('/js/data.json')
      .then(response => response.json())
      .then(data => {
        const mediaList = document.getElementById('media-list');
        const allMedia = [
          ...data.video.map(item => ({ ...item, type: 'video' })),
          ...data.photo.map(item => ({ ...item, type: 'photo' }))
        ];

        // Сортировка по дате
        allMedia.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

        // Заполнение скрытой колонки с карточками
        mediaList.innerHTML = allMedia.map(item => {
          if (item.type === 'video') {
            return `
              <a href='https://www.youtube.com/watch?v=${item.video}' target="_blank" class='media-card' data-video-number='${item.number}'>
                <img src="/img/title/${item.number}.png" alt="${item.title} - kovylyaevmedia">
                <div class="media-card-info">
                  <div class="media-title">${item.title}</div>
                  <div class="media-date">${(item.date||'').split(' ')[0].split('-').reverse().join('.')}</div>
                </div>
              </a>`;
          } else {
            return `
              <a href='${item.link}' target="_blank" class='media-card' data-photo-id='${item.id}'>
                <img src="/img/photo/${item.id}.png" alt="${item.name} - kovylyaevmedia">
                <div class="media-card-info">
                  <div class="media-title">${item.name}</div>
                  <div class="media-date">${item.date}</div>
                </div>
              </a>`;
          }
        }).join('');

        // Группировка маркеров по координатам
        const markerGroups = {};
        allMedia.forEach(item => {
          if (Array.isArray(item.coordinates) && item.coordinates.length === 2) {
            const key = item.coordinates.join(',');
            if (!markerGroups[key]) markerGroups[key] = [];
            markerGroups[key].push(item);
          }
        });

        // Функция для отображения карточки рядом с маркером
        function showMarkerCard(item, latlng) {
          const title = item.type === 'photo' ? item.name : item.title;
          const date = item.date;
          const imgSrc = item.type === 'photo' ? `/img/photo/${item.id}.png` : `/img/title/${item.number}.png`;
          const link = item.type === 'photo' ? item.link : item.video; 

          markerCard.innerHTML = `
            <img src="${imgSrc}" alt="${title}">
            <div class="media-title">${title}</div>
            <div class="media-date">${date}</div>
            <a href="${link}" target="blank" class="link">Посмотреть</a>
          `;

          // Позиционирование карточки рядом с маркером
          const point = map.latLngToContainerPoint(latlng);
          markerCard.style.left = `${point.x + 15}px`;
          markerCard.style.top = `${point.y}px`;
          markerCard.style.display = 'block';
        }

        // Функция для скрытия карточки
        function hideMarkerCard() {
          markerCard.style.display = 'none';
        }

        // Добавление маркеров на карту
        Object.entries(markerGroups).forEach(([key, items]) => {
          const [lng, lat] = key.split(',').map(Number);
          const latlng = [lat, lng];

          if (items.length === 1) {
            const item = items[0];
            const imgSrc = item.type === 'photo' ? `/img/photo/${item.id}.webp` : `/img/title/${item.number}.webp`;
            const icon = L.divIcon({
              className: 'custom-marker',
              html: `<div class='marker-img-wrap' style="background-image:url('${imgSrc}')"></div>`
            });
            const marker = L.marker(latlng, { icon }).addTo(map);

            marker.on('click', (e) => {
              showMarkerCard(item, latlng);
            });
          } else {
            // Логика для кластеров маркеров
            const icon = L.divIcon({
              className: 'custom-marker cluster-marker',
              html: `<div class='cluster-count-only'>${items.length}</div>`
            });
            const marker = L.marker(latlng, { icon }).addTo(map);

            // Раскрытие кластера при клике
            marker.on('click', (e) => {
              const angleStep = (2 * Math.PI) / items.length;
              const radius = 50;

              items.forEach((item, index) => {
                const angle = index * angleStep;
                const fanLat = lat + (radius * Math.cos(angle)) / 100000;
                const fanLng = lng + (radius * Math.sin(angle)) / 100000;
                const fanLatLng = [fanLat, fanLng];

                const imgSrc = item.type === 'photo' ? `/img/photo/${item.id}.webp` : `/img/title/${item.number}.webp`;
                const fanIcon = L.divIcon({
                  className: 'custom-marker fan-marker',
                  html: `<div class='marker-img-wrap' style="background-image:url('${imgSrc}')"></div>`
                });

                const fanMarker = L.marker(fanLatLng, { icon: fanIcon }).addTo(map);

                fanMarker.on('click', (e) => {
                  showMarkerCard(item, fanLatLng);
                });
              });
            });
          }
        });

        // Скрытие карточки при клике на карту
        map.on('click', hideMarkerCard);
      })
      .catch(error => console.error('Ошибка загрузки данных:', error));
  });
</script>
