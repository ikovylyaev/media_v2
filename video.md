---
layout: default
title: kovylyaevmedia — Видео
permalink: "/video/"
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
        <li><a href="/photo" class="nav-link">фото</a></li>
        <li><a href="/video" class="nav-link active">видео</a></li>
      </ul>
    </nav>
  </div>
</header>

<main class="photo-gallery">
  <div class="photo-grid row gap-2" id="video-grid"></div>
</main>

<script>
  document.addEventListener('DOMContentLoaded', function() {
    fetch('/js/data.json')
      .then(response => response.json())
      .then(data => {
        const videoGrid = document.getElementById('video-grid');

        // Очистка контейнера перед заполнением
        videoGrid.innerHTML = '';

        // Используем данные из data.video и сортируем в обратном порядке
        const videos = data.video.reverse();

        // Заполнение галереи видео
        videos.forEach(video => {
          const videoCard = document.createElement('div');
          videoCard.className = 'col-xl-2 col-md-3 col-sm-4 col-6 mb-3';

          videoCard.innerHTML = `
            <a class="photo-card" href="https://www.youtube.com/watch?v=${video.video}" target="_blank">
              <img src="{{ site.url }}/img/title/${video.number}.png" alt="${video.title}">
              <div class="photo-info">
                <h3>${video.title}</h3>
                <p>${video.date ? new Date(video.date).toLocaleDateString('ru-RU') : ''}</p>
              </div>
            </a>
          `;

          videoGrid.appendChild(videoCard);
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
