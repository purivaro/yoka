document.addEventListener('DOMContentLoaded', () => {

  // ==========================================================================
  // 1. Dark Mode / Theme Toggle Logic (Aligned with Tailwind and CSS variables)
  // ==========================================================================
  const themeToggleBtn = document.getElementById('theme-toggle');
  const colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');

  // Check if system prefers dark
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)');

  function updateThemeUI(theme) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark-theme', 'dark');
      document.documentElement.classList.remove('light-theme');
      colorSchemeMeta.content = 'dark';
      themeToggleBtn.textContent = 'light_mode'; // sun icon
    } else if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
      document.documentElement.classList.remove('dark-theme', 'dark');
      colorSchemeMeta.content = 'light';
      themeToggleBtn.textContent = 'dark_mode'; // moon icon
    } else {
      // System default
      document.documentElement.classList.remove('dark-theme', 'light-theme');
      const currentSystemDark = systemPrefersDark.matches;
      if (currentSystemDark) {
        document.documentElement.classList.add('dark');
        themeToggleBtn.textContent = 'light_mode';
      } else {
        document.documentElement.classList.remove('dark');
        themeToggleBtn.textContent = 'dark_mode';
      }
      colorSchemeMeta.content = 'light dark';
    }
  }

  // Initial Theme loading
  const storedTheme = localStorage.getItem('color-scheme');
  if (storedTheme) {
    updateThemeUI(storedTheme);
  } else {
    updateThemeUI('system');
  }

  // Handle manual toggle
  themeToggleBtn.addEventListener('click', () => {
    const isDark = document.documentElement.classList.contains('dark');
    const nextTheme = isDark ? 'light' : 'dark';

    localStorage.setItem('color-scheme', nextTheme);
    updateThemeUI(nextTheme);
  });

  // Watch for system preference changes at runtime
  systemPrefersDark.addEventListener('change', () => {
    if (!localStorage.getItem('color-scheme')) {
      updateThemeUI('system');
    }
  });


  // ==========================================================================
  // 2. Mobile Menu Toggle
  // ==========================================================================
  const mobileToggle = document.getElementById('mobile-toggle');
  const mobileNav = document.getElementById('mobile-nav');

  mobileToggle.addEventListener('click', () => {
    mobileNav.classList.toggle('hidden');
    if (mobileNav.classList.contains('hidden')) {
      mobileToggle.textContent = 'menu';
    } else {
      mobileToggle.textContent = 'close';
    }
  });

  // Close mobile nav when clicking a link
  mobileNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mobileNav.classList.add('hidden');
      mobileToggle.textContent = 'menu';
    });
  });


  // ==========================================================================
  // 3. Yoga Types Filter Logic
  // ==========================================================================
  const filterBtns = document.querySelectorAll('.filter-btn');
  const typeCards = document.querySelectorAll('#types-grid > div');

  // Highlight 'all' filter initially
  const defaultFilter = document.querySelector('.filter-btn[data-filter="all"]');
  if (defaultFilter) {
    defaultFilter.classList.add('bg-primary', 'text-white', 'border-primary');
    defaultFilter.classList.remove('bg-white', 'dark:bg-black', 'text-on-surface', 'border-outline-variant/60');
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Toggle active states on button classes
      filterBtns.forEach(b => {
        b.classList.remove('bg-primary', 'text-white', 'border-primary');
        b.classList.add('bg-white', 'dark:bg-black', 'text-on-surface', 'border-outline-variant/60');
      });
      btn.classList.add('bg-primary', 'text-white', 'border-primary');
      btn.classList.remove('bg-white', 'dark:bg-black', 'text-on-surface', 'border-outline-variant/60');

      const filterValue = btn.getAttribute('data-filter');

      typeCards.forEach(card => {
        const cardTags = card.getAttribute('data-tags') || '';
        
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
  const stepPanes = document.querySelectorAll('.step-pane-view');
  const prevBtn = document.getElementById('prev-step-btn');
  const nextBtn = document.getElementById('next-step-btn');
  let currentStep = 0;

  const stepTips = [
    {
      mistake: "ยกไหล่หนีบหู และหลังโก่งค่อมเข่าตึงจนเกินไป",
      correct: "กางนิ้วมือดันพื้นให้แน่น ยืดอกดึงไหล่ห่างใบหู ดันสะโพกขึ้นและยืดหลังยาวตรง"
    },
    {
      mistake: "เกร็งหน้าท้องสะโพกลอยสูง ไม่ยอมผ่อนคลายร่างกายลงหาเสื่อ",
      correct: "ยืดแขนสองข้างไปด้านหน้าให้สุด วางหน้าผากผ่อนคลาย และกดสะโพกทับส้นเท้า"
    },
    {
      mistake: "เงยหน้าก้มคอหักมากจนปวดกล้ามเนื้อคอบ่าไหล่",
      correct: "กดหลังเท้าและหน้าขาแนบพื้น ยืดอกขึ้นดึงไหล่เปิดออกด้านหลังอย่างผ่อนคลาย"
    }
  ];

  function updateStepper(index) {
    currentStep = index;

    // Header buttons styling
    stepBtns.forEach((btn, i) => {
      const stepNum = btn.querySelector('span');
      if (i === index) {
        btn.classList.add('border-primary');
        btn.classList.remove('border-outline-variant', 'opacity-45');
        if (stepNum) {
          stepNum.classList.add('text-primary');
          stepNum.classList.remove('text-on-surface-variant');
        }
      } else {
        btn.classList.remove('border-primary');
        btn.classList.add('border-outline-variant', 'opacity-45');
        if (stepNum) {
          stepNum.classList.remove('text-primary');
          stepNum.classList.add('text-on-surface-variant');
        }
      }
    });

    // Content panes toggle
    stepPanes.forEach((pane, i) => {
      if (i === index) {
        pane.classList.remove('hidden');
        pane.classList.add('active');
      } else {
        pane.classList.add('hidden');
        pane.classList.remove('active');
      }
    });

    // Update mistake/correct text tips
    const tips = stepTips[index];
    document.getElementById('mistake-text').textContent = tips.mistake;
    document.getElementById('correct-text').textContent = tips.correct;

    // Navigation buttons state
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
      desc: 'คุณเหมาะกับการฝึกแบบดั้งเดิมที่เน้นท่วงท่าช้าๆ จัดปรับสรีระอย่างนุ่มนวลและสติระลึกรู้ ปลอดภัยสำหรับผู้ฝึกหัดใหม่และสร้างรากฐานร่างกายที่ดีครับ'
    },
    vinyasa: {
      title: 'Vinyasa Yoga (วินยาสะโยคะ)',
      desc: 'คุณเหมาะกับการฝึกที่ไหลลื่นตามจังหวะลมหายใจ ได้ออกกำลังกายอย่างต่อเนื่อง ได้เหงื่อกระตุ้นหัวใจ คาร์ดิโอ และสร้างความแข็งแกร่งอย่างลื่นไหลครับ'
    },
    yin: {
      title: 'Yin Yoga (หยินโยคะ)',
      desc: 'คุณเหมาะกับการฝึกค้างท่าอย่างช้าๆ ผ่อนคลายลึกๆ ช่วยบำบัดฟื้นฟูข้อต่อและพังผืดลึก ปลดปล่อยความตึงเครียดสะสมจากออฟฟิศซินโดรมและจิตใจได้ดีที่สุด'
    },
    ashtanga: {
      title: 'Ashtanga Yoga (อัษฎางคโยคะ)',
      desc: 'คุณเหมาะกับการฝึกสายดั้งเดิมที่มีความสม่ำเสมอ มีระเบียบวินัยและลำดับท่าที่ตายตัว ท้าทายทั้งความแข็งแกร่งทางกายภาพและพลังสมาธิขั้นสูงสุดครับ'
    }
  };

  // Open Quiz Modal
  quizTriggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
      resetQuiz();
      quizModal.showModal();
    });
  });

  // Close Quiz Modal
  closeQuizBtn.addEventListener('click', () => quizModal.close());

  // Light Dismiss: Close quiz modal on clicking backdrop
  quizModal.addEventListener('click', (e) => {
    if (e.target === quizModal) {
      quizModal.close();
    }
  });

  // Quiz Options Click
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
    quizSteps[currentQuizStepIndex].classList.add('hidden');
    currentQuizStepIndex++;

    // Calculate progress
    const progressPercent = Math.min((currentQuizStepIndex / 3) * 100, 100);
    quizProgress.style.width = `${progressPercent}%`;

    if (currentQuizStepIndex < 3) {
      quizSteps[currentQuizStepIndex].classList.add('active');
      quizSteps[currentQuizStepIndex].classList.remove('hidden');
    } else {
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

    // Set quiz recommendation action
    quizCtaBtn.onclick = () => {
      quizModal.close();
      const typesSection = document.getElementById('types');
      typesSection.scrollIntoView({ behavior: 'smooth' });

      // Highlight the matching filter btn
      const filterMap = { hatha: 'gentle', vinyasa: 'dynamic', yin: 'restorative', ashtanga: 'dynamic' };
      const matchedFilter = document.querySelector(`.filter-btn[data-filter="${filterMap[maxType]}"]`);
      if (matchedFilter) matchedFilter.click();
    };

    document.getElementById('quiz-result-step').classList.add('active');
    document.getElementById('quiz-result-step').classList.remove('hidden');
  }

  function resetQuiz() {
    quizAnswers = [];
    currentQuizStepIndex = 0;
    quizProgress.style.width = '0%';
    quizSteps.forEach(step => {
      step.classList.remove('active');
      step.classList.add('hidden');
    });
    quizSteps[0].classList.add('active');
    quizSteps[0].classList.remove('hidden');
  }

  quizRestartBtn.addEventListener('click', resetQuiz);


  // ==========================================================================
  // 6. Registration Modal & Success Toast Logic
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

  registerModal.addEventListener('click', (e) => {
    if (e.target === registerModal) {
      registerModal.close();
    }
  });

  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const planText = selectedPlanName.textContent;

    // Close and reset form
    registerModal.close();
    registerForm.reset();

    // Trigger Toast Success
    toastTitle.textContent = 'ลงทะเบียนสำเร็จ!';
    toastMessage.textContent = `ยินดีต้อนรับคุณ ${name} เข้าสู่สตูดิโอ YOKA แผน ${planText} เรียบร้อยแล้วครับ!`;

    // Toggle Tailwind classes to show toast
    toast.classList.remove('translate-y-24', 'opacity-0', 'pointer-events-none');
    toast.classList.add('translate-y-0', 'opacity-100');

    setTimeout(() => {
      toast.classList.add('translate-y-24', 'opacity-0', 'pointer-events-none');
      toast.classList.remove('translate-y-0', 'opacity-100');
    }, 5000);
  });

});
