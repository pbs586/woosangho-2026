document.addEventListener('DOMContentLoaded', () => {
    // 1. Scroll Animations (Intersection Observer)
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    // Initial check for animate-up elements
    document.querySelectorAll('.animate-up').forEach(el => observer.observe(el));

    // 2. Navbar Scroll Effect
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        const handleScroll = () => {
            if (window.scrollY > 50) {
                navbar.style.padding = '12px 0';
                navbar.style.background = 'rgba(255, 255, 255, 0.95)';
            } else {
                navbar.style.padding = '20px 0';
                navbar.style.background = 'rgba(255, 255, 255, 0.8)';
            }
        };
        window.addEventListener('scroll', handleScroll);
        handleScroll(); // Initial check
    }

    // 3. API 데이터 연동 (뉴스 & 갤러리)
    async function fetchMainData() {
        try {
            // 0. 우상호의 오늘 데이터 (최근 1개)
            const todayRes = await fetch('/api/today');
            if (todayRes.ok) {
                const todayData = await todayRes.json();
                const todaySection = document.getElementById('today');
                const todayContent = document.getElementById('today-content');
                
                if (todaySection && todayContent && todayData.length > 0) {
                    const item = todayData[0]; // 가장 최신 1개 사용
                    todaySection.style.display = 'block';
                    todayContent.innerHTML = `
                        <div class="today-card">
                            ${item.imageUrl ? `
                            <a href="${item.imageUrl}" target="_blank" style="display: block; height: 100%; width: 100%; text-decoration: none; cursor: pointer;">
                                <div class="today-img" style="background-image: url('${item.imageUrl}'); background-size: cover; background-position: center; height: 100%;"></div>
                            </a>` : `
                            <div class="today-img" style="background: #eee;">
                                <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #aaa;">No Image</div>
                            </div>`}
                            <div class="today-info">
                                <span class="date">${item.date}</span>
                                <p>${item.description || '내용 없음'}</p>
                            </div>
                        </div>
                    `;
                } else if (todaySection) {
                    todaySection.style.display = 'none';
                }
            }

            // 뉴스 데이터 (최근 3개)
            const newsRes = await fetch('/api/news');
            if (newsRes.ok) {
                const newsData = await newsRes.json();
                const newsGrid = document.querySelector('.news-grid');
                if (newsGrid && newsData.length > 0) {
                    newsGrid.innerHTML = newsData.slice(0, 3).map(item => `
                        <div class="news-card animate-up" onclick="openNewsModal(${JSON.stringify(item).replace(/"/g, '&quot;')})" style="cursor: pointer;">
                            <div class="news-img" style="background-image: url('${item.thumbnailUrl || '/placeholder.jpg'}'); background-size: cover; background-position: center; height: 220px;"></div>
                            <div class="news-info">
                                <span class="date">${item.date}</span>
                                <h3>${item.title}</h3>
                                <p>${item.content}</p>
                            </div>
                        </div>
                    `).join('');
                }
            }

            // 갤러리 데이터 (최근 6개)
            const galleryRes = await fetch('/api/gallery');
            if (galleryRes.ok) {
                const galleryData = await galleryRes.json();
                const galleryGrid = document.querySelector('.gallery-grid');
                if (galleryGrid && galleryData.length > 0) {
                    galleryGrid.innerHTML = galleryData.slice(0, 6).map(item => `
                        <div class="gallery-item animate-up" onclick="openGalleryModal('${item.url}', '${item.description}', '${item.date || ''}')" style="cursor: pointer;">
                            <img src="${item.url}" alt="${item.description}">
                        </div>
                    `).join('');
                }
            }

            // 새롭게 추가된 요소들에 애니메이션 다시 적용
            document.querySelectorAll('.animate-up').forEach(el => observer.observe(el));
        } catch (err) {
            console.error('데이터 로드 실패:', err);
        }
    }

    fetchMainData();

    // 4. Mobile Menu Toggle
    const menuToggle = document.getElementById('mobile-menu');
    const navLinks = document.querySelector('.nav-links');

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            navLinks.classList.toggle('active');
            if (navLinks.classList.contains('active')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = 'auto';
            }
        });

        // Close menu when link is clicked
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                menuToggle.classList.remove('active');
                navLinks.classList.remove('active');
                document.body.style.overflow = 'auto';
            });
        });
    }

    // 5. 모달 닫기 로직
    const galleryModal = document.getElementById('gallery-modal');
    const newsModal = document.getElementById('news-modal'); 
    const pledgeModal = document.getElementById('pledge-modal');

    const closeModal = () => {
        if (galleryModal) galleryModal.style.display = 'none';
        if (newsModal) newsModal.style.display = 'none';
        if (pledgeModal) pledgeModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    };

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.onclick = closeModal;
    });

    window.onclick = (event) => {
        if (event.target === galleryModal || event.target === newsModal || event.target === pledgeModal) {
            closeModal();
        }
    };

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
});

// 뉴스 모달 열기
function openNewsModal(item) {
    const modal = document.getElementById('news-modal');
    const modalImg = document.getElementById('news-modal-img');
    const modalDate = document.getElementById('news-modal-date');
    const modalTitle = document.getElementById('news-modal-title');
    const modalSummary = document.getElementById('news-modal-summary');
    const modalText = document.getElementById('news-modal-text');
    const modalLink = document.getElementById('news-modal-link');

    if (modal) {
        if (modalImg) {
            modalImg.src = item.thumbnailUrl || '/placeholder.jpg';
            modalImg.alt = item.title;
        }
        if (modalDate) modalDate.textContent = item.date;
        if (modalTitle) modalTitle.textContent = item.title;
        if (modalSummary) modalSummary.textContent = item.content;
        if (modalText) modalText.textContent = item.detailContent || item.content;

        if (modalLink) {
            if (item.link) {
                modalLink.href = item.link;
                modalLink.style.display = 'inline-block';
            } else {
                modalLink.style.display = 'none';
            }
        }

        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

// 갤러리 모달 열기
function openGalleryModal(url, description, date) {
    const modal = document.getElementById('gallery-modal');
    const modalImg = document.getElementById('gallery-modal-img');
    const modalDesc = document.getElementById('gallery-modal-desc');
    const modalDate = document.getElementById('gallery-modal-date');

    if (modal) {
        if (modalImg) modalImg.src = url;
        if (modalDesc) modalDesc.textContent = description || '우상호 후보의 활동 모습입니다.';
        if (modalDate) modalDate.textContent = date || '';
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}
