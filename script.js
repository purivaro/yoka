document.addEventListener('DOMContentLoaded', () => {

  // ==========================================================================
  // 1. Dark Mode / Theme Toggle Logic (Aligned with the 'dark-mode' guide)
  // ==========================================================================
  const themeToggleBtn = document.getElementById('theme-toggle');
  const colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');
  const themeIcon = themeToggleBtn.querySelector('i');

  // Check if system prefers dark
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)');

  function updateThemeUI(theme) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark-theme');
      document.documentElement.classList.remove('light-theme');
      colorSchemeMeta.content = 'dark';
      themeIcon.className = 'fa-solid fa-sun'; // sun icon for light mode trigger
    } else if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
      document.documentElement.classList.remove('dark-theme');
      colorSchemeMeta.content = 'light';
      themeIcon.className = 'fa-solid fa-moon'; // moon icon for dark mode trigger
    } else {
      // Default / System preferred
      document.documentElement.classList.remove('dark-theme', 'light-theme');
      colorSchemeMeta.content = 'light dark';
      const currentSystemDark = systemPrefersDark.matches;
      themeIcon.className = currentSystemDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    }
  }

  // Initial Theme loading
  const storedTheme = localStorage.getItem('color-scheme');
  if (storedTheme) {
    updateThemeUI(storedTheme);
  } else {
    // Follow system settings
    updateThemeUI('system');
  }

  // Handle manual toggle (System -> opposite -> Opposite pinned)
  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = colorSchemeMeta.content;
    let nextTheme = 'light';
    
    // Toggle theme state
    if (currentTheme.includes('light') && !currentTheme.includes('dark')) {
      nextTheme = 'dark';
    } else if (currentTheme.includes('dark') && !currentTheme.includes('light')) {
      nextTheme = 'light';
    } else {
      // It is currently system (light dark). Pinned theme will be the opposite of current preference
      nextTheme = systemPrefersDark.matches ? 'light' : 'dark';
    }

    localStorage.setItem('color-scheme', nextTheme);
    updateThemeUI(nextTheme);
  });

  // Watch for system preference changes at runtime
  systemPrefersDark.addEventListener('change', (e) => {
    if (!localStorage.getItem('color-scheme')) {
      updateThemeUI('system');
    }
  });


  // ==========================================================================
  // 2. Mobile Menu Toggle
  // ==========================================================================
  const mobileToggle = document.getElementById('mobile-toggle');
  const mainNav = document.getElementById('main-nav');

  mobileToggle.addEventListener('click', () => {
    mainNav.classList.toggle('mobile-open');
    const icon = mobileToggle.querySelector('i');
    if (mainNav.classList.contains('mobile-open')) {
      icon.className = 'fa-solid fa-xmark';
      mainNav.style.display = 'flex';
      mainNav.style.flexDirection = 'column';
      mainNav.style.position = 'absolute';
      mainNav.style.top = '80px';
      mainNav.style.left = '0';
      mainNav.style.width = '100%';
      mainNav.style.backgroundColor = 'var(--color-header-bg)';
      mainNav.style.padding = '20px';
      mainNav.style.borderBottom = '1px solid var(--color-border)';
      mainNav.style.gap = '20px';
    } else {
      icon.className = 'fa-solid fa-bars';
      mainNav.style.display = '';
    }
  });

  // Close mobile nav when clicking a link
  mainNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      if (mainNav.classList.contains('mobile-open')) {
        mainNav.classList.remove('mobile-open');
        mobileToggle.querySelector('i').className = 'fa-solid fa-bars';
        mainNav.style.display = '';
      }
    });
  });


  // ==========================================================================
  // 3. Yoga Types Filter Logic
  // ==========================================================================
  const filterBtns = document.querySelectorAll('.filter-btn');
  const typeCards = document.querySelectorAll('.type-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Toggle active status
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filterValue = btn.getAttribute('data-filter');

      typeCards.forEach(card => {
        const cardTags = card.getAttribute('data-tags');
        
        if (filterValue === 'all' || cardTags.includes(filterValue)) {
          card.style.display = 'flex';
          card.style.opacity = '0';
          setTimeout(() => {
            card.style.transition = 'opacity 0.4s ease';
            card.style.opacity = '1';
          }, 50);
        } else {
          card.style.display = 'none';
        }
      });
    });
  });


  // ==========================================================================
  // 4. Interactive Stepper Tutorial Logic
  // ==========================================================================
  const stepBtns = document.querySelectorAll('.step-btn');
  const stepPanes = document.querySelectorAll('.step-pane');
  const prevBtn = document.getElementById('prev-step-btn');
  const nextBtn = document.getElementById('next-step-btn');
  let currentStep = 0;

  function updateStepper(index) {
    currentStep = index;

    // Header buttons
    stepBtns.forEach((btn, i) => {
      if (i === index) btn.classList.add('active');
      else btn.classList.remove('active');
    });

    // Content panes
    stepPanes.forEach((pane, i) => {
      if (i === index) pane.classList.add('active');
      else pane.classList.remove('active');
    });

    // Navigation Controls state
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === stepPanes.length - 1;
  }

  stepBtns.forEach((btn, i) => {
    btn.addEventListener('click', () => updateStepper(i));
  });

  prevBtn.addEventListener('click', () => {
    if (currentStep > 0) {
      updateStepper(currentStep - 1);
    }
  });

  nextBtn.addEventListener('click', () => {
    if (currentStep < stepPanes.length - 1) {
      updateStepper(currentStep + 1);
    }
  });


  // ==========================================================================
  // 5. Yoga Quiz Logic
  // ==========================================================================
  const quizModal = document.getElementById('quiz-modal');
  const quizTriggers = document.querySelectorAll('.quiz-trigger');
  const closeQuizBtn = document.getElementById('close-quiz');
  const quizSteps = document.querySelectorAll('.quiz-step');
  const quizProgress = document.getElementById('quiz-progress-fill');
  const recommendedType = document.getElementById('recommended-yoga-type');
  const recommendedDesc = document.getElementById('recommended-yoga-desc');
  const quizRestartBtn = document.getElementById('quiz-restart');
  const quizCtaBtn = document.getElementById('quiz-cta-action');

  let quizAnswers = [];
  let currentQuizStepIndex = 0;

  const yogaTypeDetails = {
    hatha: {
      title: 'Hatha Yoga (หฐโยคะ)',
      desc: 'คุณเหมาะกับการฝึกแบบดั้งเดิมที่เน้นท่วงท่าช้าๆ จัดปรับสรีระอย่างนุ่มนวลและสติระลึกรู้ ปลอดภัยสำหรับผู้ฝึกหัดใหม่และเสริมสร้างรากฐานที่ดีครับ'
    },
    vinyasa: {
      title: 'Vinyasa Yoga (วินยาสะโยคะ)',
      desc: 'คุณเหมาะกับการฝึกที่ไหลลื่นตามลมหายใจ ได้ระเบิดพลังงาน กระตุ้นหัวใจ คาร์ดิโอ และสร้างกล้ามเนื้อแกนกลางที่แข็งแกร่งอย่างสนุกสนานครับ'
    },
    yin: {
      title: 'Yin Yoga (หยินโยคะ)',
      desc: 'คุณเหมาะกับการฝึกแบบเย็นค้างท่าอย่างสงบและผ่อนคลายลึกๆ ช่วยคลายเนื้อเยื่อข้อต่อและปลดปล่อยความตึงเครียดสะสมจากออฟฟิศซินโดรมได้อย่างดีเลิศ'
    },
    ashtanga: {
      title: 'Ashtanga Yoga (อัษฎางคโยคะ)',
      desc: 'คุณเหมาะกับการฝึกสายวินัยความท้าทายขั้นสูงแบบดั้งเดิม ท่าทางสม่ำเสมอมีระเบียบระบบชัดเจน ได้ทดสอบความอดทนและความแข็งแกร่งของร่างกายสูงสุด'
    }
  };

  // Open modal
  quizTriggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
      resetQuiz();
      quizModal.showModal();
    });
  });

  // Close modal
  closeQuizBtn.addEventListener('click', () => quizModal.close());

  // Light dismiss: Close on outside click
  quizModal.addEventListener('click', (e) => {
    if (e.target === quizModal) {
      quizModal.close();
    }
  });

  // Handle option selection
  const optionButtons = document.querySelectorAll('.quiz-opt');
  optionButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const score = btn.getAttribute('data-score');
      quizAnswers.push(score);

      goToNextQuizStep();
    });
  });

  function goToNextQuizStep() {
    quizSteps[currentQuizStepIndex].classList.remove('active');
    currentQuizStepIndex++;

    // Calculate progress (3 questions total, index goes from 0 -> 1 -> 2 -> Result)
    const progressPercent = Math.min((currentQuizStepIndex / 3) * 100, 100);
    quizProgress.style.width = `${progressPercent}%`;

    if (currentQuizStepIndex < 3) {
      quizSteps[currentQuizStepIndex].classList.add('active');
    } else {
      // Calculate and show result
      showQuizResult();
    }
  }

  function showQuizResult() {
    // Find the most frequent answer
    const counts = {};
    let maxType = 'hatha';
    let maxCount = 0;

    quizAnswers.forEach(ans => {
      counts[ans] = (counts[ans] || 0) + 1;
      if (counts[ans] > maxCount) {
        maxCount = counts[ans];
        maxType = ans;
      }
    });

    const result = yogaTypeDetails[maxType];
    recommendedType.textContent = result.title;
    recommendedDesc.textContent = result.desc;

    // Set CTA action (Scroll directly to that type card on the main page)
    quizCtaBtn.onclick = () => {
      quizModal.close();
      const typesSection = document.getElementById('types');
      typesSection.scrollIntoView({ behavior: 'smooth' });

      // Automatically click matching filter to highlight class
      const filterMap = { hatha: 'gentle', vinyasa: 'dynamic', yin: 'restorative', ashtanga: 'dynamic' };
      const matchedFilter = document.querySelector(`.filter-btn[data-filter="${filterMap[maxType]}"]`);
      if (matchedFilter) matchedFilter.click();
    };

    document.getElementById('quiz-result-step').classList.add('active');
  }

  function resetQuiz() {
    quizAnswers = [];
    currentQuizStepIndex = 0;
    quizProgress.style.width = '0%';
    quizSteps.forEach(step => step.classList.remove('active'));
    quizSteps[0].classList.add('active');
  }

  quizRestartBtn.addEventListener('click', resetQuiz);


  // ==========================================================================
  // 6. Registration Modal & Toast Logic
  // ==========================================================================
  const registerModal = document.getElementById('register-modal');
  const closeRegisterBtn = document.getElementById('close-register');
  const registerForm = document.getElementById('register-form');
  const registerTriggers = document.querySelectorAll('.register-trigger');
  const selectedPlanName = document.getElementById('selected-plan-name');

  const toast = document.getElementById('toast-success');
  const toastTitle = document.getElementById('toast-title');
  const toastMessage = document.getElementById('toast-message');

  registerTriggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
      const plan = trigger.getAttribute('data-plan');
      selectedPlanName.textContent = plan === 'Free' ? 'Free Tier (สมาชิกทดลองฝึกฟรี)' : 'Premium Tier (สมาชิกระดับพรีเมียม)';
      registerModal.showModal();
    });
  });

  closeRegisterBtn.addEventListener('click', () => registerModal.close());

  // Light dismiss: Close on outside click
  registerModal.addEventListener('click', (e) => {
    if (e.target === registerModal) {
      registerModal.close();
    }
  });

  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const planText = selectedPlanName.textContent;

    // Close Modal
    registerModal.close();
    registerForm.reset();

    // Show Beautiful Success Toast
    toastTitle.textContent = 'สมัครสมาชิกสำเร็จ!';
    toastMessage.textContent = `ยินดีต้อนรับคุณ ${name} สู่ครอบครัว YOKA แผน ${planText} แล้วครับ!`;
    
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 5000);
  });

});
