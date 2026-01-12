---
layout: default
title: kovylyaevmedia — Фото
permalink: "/photo/"
---
<header class="site-header">
  <div class="header-inner">
    <div class="logo">
      <a href="/" class="navbar-brand">
        <img src="{{ site.url }}/img/media_dark.svg" style="height: 48px;">
      </a>
    </div>
    <nav class="main-nav">
      <ul>
        <li><a href="/" class="nav-link">карта</a></li>
        <li><a href="/photo" class="nav-link active">фото</a></li>
        <li><a href="/video" class="nav-link">видео</a></li>
      </ul>
    </nav>
  </div>
</header>

<main class="photo-gallery">
  <div class="photo-grid row gap-2" id="photo-grid"></div>
</main>

<script>
  document.addEventListener('DOMContentLoaded', function() {
    fetch('/js/data.json')
      .then(response => response.json())
      .then(data => {
        const photoGrid = document.getElementById('photo-grid');

        // Очистка контейнера перед заполнением
        photoGrid.innerHTML = '';

        // Используем данные из data.photo и сортируем в обратном порядке
        const photos = data.photo.reverse(); // <-- Добавляем reverse()

        // Заполнение галереи фотографиями
        photos.forEach(photo => {
          const photoCard = document.createElement('div');
          photoCard.className = 'col-xl-2 col-md-3 col-sm-4 col-6 mb-3';

          photoCard.innerHTML = `
            <a class="photo-card" href="${photo.link}" target="_blank">
                <img src="{{ site.url }}/img/photo/${photo.id}.webp" alt="${photo.name}">
                <div class="photo-info">
                    <h3>${photo.name}</h3>
                    <p>${photo.date}</p>
                </div>
            </a>
          `;

          photoGrid.appendChild(photoCard);
        });
      })
      .catch(error => console.error('Ошибка загрузки данных:', error));
  });
</script>

<footer>
  <div class="logo">
    <a href="/" class="navbar-brand">
      <img src="{{ site.url }}/img/media_dark.svg" style="height: 32px;">
    </a>
  </div>
  <nav class="footer-nav">
    <ul>
      <li><a href="http://ikovylyaev.com" class="nav-link active">дизайн: ikovylyaev</a></li>
      <li><a href="{{site.url}}/terms" class="nav-link">правила использования</a></li>
      <li><a href="{{site.url}}/privacy" class="nav-link">политика конфиденциальности</a></li>
    </ul>
  </nav>
</footer>