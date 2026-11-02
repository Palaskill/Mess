'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'fr' | 'ar' | 'en';

export interface Translations {
  common: {
    cancel: string;
    confirm: string;
    delete: string;
    open: string;
    close: string;
    save: string;
    edit: string;
    loading: string;
    error: string;
    success: string;
    share: string;
    copied: string;
    yes: string;
    no: string;
    back: string;
    deleteConfirm: string;
    items: string;
    item: string;
    dt: string;
  };
  nav: {
    home: string;
    admin: string;
  };
  home: {
    title: string;
    subtitle: string;
    totalSessions: string;
    activeNow: string;
    emptyTitle: string;
    emptyDesc: string;
    startFirstSession: string;
    scanOcr: string;
    scanOcrDesc: string;
    assignPillar: string;
    assignPillarDesc: string;
    splitPillar: string;
    splitPillarDesc: string;
    recentSessions: string;
    tapToView: string;
    newSessionBtn: string;
  };
  session: {
    back: string;
    active: string;
    closed: string;
    openedOn: string;
    ordersTab: string;
    friendsTab: string;
    billTab: string;
    unassignedBadge: string;
    articlesCount: string;
    friendsSeated: string;
    splitNet: string;
    readOnlyTitle: string;
    readOnlyDesc: string;
    unlock: string;
    lock: string;
    unlockedOrganizer: string;
    organizerBadge: string;
    readOnlyBadge: string;
    unlockModalTitle: string;
    unlockModalSubtitle: string;
    creatorPassword: string;
    passwordPlaceholder: string;
    verifying: string;
    unlockAction: string;
    enterPasswordError: string;
  };
  orders: {
    title: string;
    placedCount: string;
    scanner: string;
    newOrder: string;
    noOrders: string;
    noOrdersDesc: string;
    scanButton: string;
    manualButton: string;
    foodSplit: string;
    individual: string;
    weightPending: string;
    fillPrice: string;
    adjust: string;
    deleteOrder: string;
    unassignedItemsNotice: string;
    splitWays: string;
    each: string;
    allFriendsSeatedNotice: string;
  };
  friends: {
    title: string;
    addFriend: string;
    noFriends: string;
    noFriendsDesc: string;
    addFirstFriend: string;
    friendName: string;
    namePlaceholder: string;
    friendColor: string;
    adding: string;
    seated: string;
    modalTitle: string;
    modalSubtitle: string;
  };
  bill: {
    whoPaysWhat: string;
    realTimeSplit: string;
    shareTab: string;
    copied: string;
    unassignedAlert: string;
    weightAlert: string;
    visualSplit: string;
    totalTable: string;
    tip: string;
    addTip: string;
    tipOptional: string;
    removeTip: string;
    tipAmount: string;
    whoTips: string;
    all: string;
    none: string;
    eachTipperPays: string;
    noItems: string;
    subtotal: string;
    unassignedTable: string;
    grandTotal: string;
    closeTab: string;
    closingTab: string;
    readOnlyBadge: string;
    shareHeader: string;
    shareSubtotal: string;
    shareTip: string;
    shareGrandTotal: string;
    shareUnassigned: string;
    shareFooter: string;
  };
  createSession: {
    modalTitle: string;
    modalSubtitle: string;
    sessionNameLabel: string;
    sessionNamePlaceholder: string;
    passwordLabel: string;
    requiredBadge: string;
    passwordPlaceholder: string;
    passwordHelp: string;
    quickSuggestions: string;
    friendsAtTable: string;
    friendsHelp: string;
    createButton: string;
    creating: string;
    nameRequiredError: string;
    passwordRequiredError: string;
    passwordLengthError: string;
  };
}

export const translations: Record<Language, Translations> = {
  fr: {
    common: {
      cancel: 'Annuler',
      confirm: 'Confirmer',
      delete: 'Supprimer',
      open: 'Ouvrir',
      close: 'Fermer',
      save: 'Enregistrer',
      edit: 'Modifier',
      loading: 'Chargement...',
      error: 'Erreur',
      success: 'Succès',
      share: 'Partager',
      copied: 'Copié !',
      yes: 'Oui',
      no: 'Non',
      back: 'Retour',
      deleteConfirm: 'Supprimer ?',
      items: 'articles',
      item: 'article',
      dt: 'DT',
    },
    nav: {
      home: 'Accueil',
      admin: 'Menu',
    },
    home: {
      title: 'MEss',
      subtitle: "Partage d'addition & sessions de table entre amis",
      totalSessions: 'Sessions au total',
      activeNow: 'Actives en ce moment',
      emptyTitle: 'Aucune session active',
      emptyDesc: "Une sortie au bar, café ou restaurant ? Ouvrez une session pour enregistrer l'addition et la partager sans calcul manuel.",
      startFirstSession: 'Créer une session',
      scanOcr: 'Scan OCR',
      scanOcrDesc: 'Prenez le ticket en photo, les prix en DT sont importés par IA.',
      assignPillar: 'Affectation',
      assignPillarDesc: 'Attribuez chaque consommation ou divisez les plats partagés.',
      splitPillar: 'Partage net',
      splitPillarDesc: 'Calcul exact au millime près avec pourboire équitable.',
      recentSessions: 'Sessions récentes',
      tapToView: 'Touchez pour ouvrir',
      newSessionBtn: 'Nouvelle Session',
    },
    session: {
      back: 'Sessions',
      active: 'Active',
      closed: 'Clôturée',
      openedOn: 'Ouvert le',
      ordersTab: 'Commandes',
      friendsTab: 'Amis',
      billTab: "L'Addition",
      unassignedBadge: 'à affecter',
      articlesCount: 'articles',
      friendsSeated: 'convive(s)',
      splitNet: 'Partage net',
      readOnlyTitle: 'Mode Lecture Seule',
      readOnlyDesc: 'Seul le créateur peut modifier. Vous pouvez consulter et partager.',
      unlock: 'Déverrouiller',
      lock: 'Verrouiller 🔒',
      unlockedOrganizer: 'Session déverrouillée (Accès organisateur)',
      organizerBadge: '🔓 Organisateur',
      readOnlyBadge: '🔒 Lecture seule',
      unlockModalTitle: 'Déverrouiller la Session',
      unlockModalSubtitle: 'Entrez le mot de passe défini par le créateur',
      creatorPassword: 'Mot de passe créateur',
      passwordPlaceholder: 'Entrez le mot de passe',
      verifying: 'Vérification...',
      unlockAction: 'Déverrouiller',
      enterPasswordError: 'Veuillez entrer le mot de passe',
    },
    orders: {
      title: 'Commandes & Tournées',
      placedCount: 'commandes enregistrées',
      scanner: 'Scanner',
      newOrder: 'Nouvelle Commande',
      noOrders: 'Aucune commande pour le moment',
      noOrdersDesc: "Scannez le ticket de caisse en photo pour tout importer par IA, ou passez votre commande manuellement !",
      scanButton: "Scanner l'Addition (IA Gemini)",
      manualButton: 'Commande Manuelle',
      foodSplit: 'Food / Partagé',
      individual: 'Individuel',
      weightPending: "Prix au grammage en attente de l'addition",
      fillPrice: 'Renseigner prix',
      adjust: 'Ajuster',
      deleteOrder: 'Supprimer commande',
      unassignedItemsNotice: 'non affecté(s) — tapez qui a pris :',
      splitWays: 'Partagé en',
      each: 'chacun',
      allFriendsSeatedNotice: 'Ajoutez des amis dans l’onglet Amis pour leur affecter ce plat !',
    },
    friends: {
      title: 'Amis à Table',
      addFriend: 'Ajouter un ami',
      noFriends: 'Aucun ami ajouté pour l’instant',
      noFriendsDesc: 'Ajoutez tout le monde à votre table pour commencer le partage.',
      addFirstFriend: 'Ajouter le premier ami',
      friendName: "Nom de l'ami",
      namePlaceholder: 'ex: Mohamed, Sara...',
      friendColor: 'Couleur',
      adding: 'Ajout en cours...',
      seated: 'Installé à',
      modalTitle: 'Ajouter un ami',
      modalSubtitle: 'Ajoutez un nouveau convive à la table',
    },
    bill: {
      whoPaysWhat: 'Qui paie quoi',
      realTimeSplit: 'Répartition en temps réel des consommations individuelles et partagées',
      shareTab: 'Partager',
      copied: 'Copié !',
      unassignedAlert: 'non affecté sur la table !',
      weightAlert: 'article(s) au grammage sans prix défini (0 DT)',
      visualSplit: "Répartition de l'Addition",
      totalTable: 'Total table',
      tip: 'Pourboire',
      addTip: 'Ajouter un pourboire',
      tipOptional: 'Gratification optionnelle pour le service',
      removeTip: 'Supprimer pourboire',
      tipAmount: 'Montant du pourboire (DT)',
      whoTips: 'Qui participe au pourboire ?',
      all: 'Tous',
      none: 'Aucun',
      eachTipperPays: 'Part par participant :',
      noItems: 'Aucun article affecté',
      subtotal: 'Sous-total',
      unassignedTable: 'Non affecté sur la table',
      grandTotal: 'Grand Total',
      closeTab: 'Clôturer la table',
      closingTab: 'Clôture...',
      readOnlyBadge: 'Lecture seule',
      shareHeader: "Addition & Partage",
      shareSubtotal: 'Sous-total',
      shareTip: 'Pourboire',
      shareGrandTotal: 'Grand Total',
      shareUnassigned: 'Non affecté sur la table',
      shareFooter: 'Partagé via MEss 🍺',
    },
    createSession: {
      modalTitle: 'Nouvelle Session',
      modalSubtitle: 'Définissez la table et les amis présents',
      sessionNameLabel: 'Nom de la session',
      sessionNamePlaceholder: 'ex: Verre du vendredi au Cosy',
      passwordLabel: 'Mot de passe créateur',
      requiredBadge: 'Obligatoire',
      passwordPlaceholder: 'ex: 1234 ou votre code secret',
      passwordHelp: '🔒 Seul vous pourrez ajouter des commandes, scanner ou affecter. Les autres personnes auront un accès en lecture seule.',
      quickSuggestions: 'Suggestions rapides',
      friendsAtTable: 'Amis à table',
      friendsHelp: "Vous pourrez ajouter d'autres convives à tout moment",
      createButton: 'Créer la session',
      creating: 'Création...',
      nameRequiredError: 'Veuillez entrer un nom pour la session',
      passwordRequiredError: 'Veuillez définir un mot de passe pour verrouiller les modifications',
      passwordLengthError: 'Le mot de passe doit comporter au moins 2 caractères',
    },
  },
  ar: {
    common: {
      cancel: 'إلغاء',
      confirm: 'تأكيد',
      delete: 'حذف',
      open: 'فتح',
      close: 'إغلاق',
      save: 'حفظ',
      edit: 'تعديل',
      loading: 'جارٍ التحميل...',
      error: 'خطأ',
      success: 'تم بنجاح',
      share: 'مشاركة',
      copied: 'تم النسخ!',
      yes: 'نعم',
      no: 'لا',
      back: 'رجوع',
      deleteConfirm: 'حذف؟',
      items: 'عناصر',
      item: 'عنصر',
      dt: 'د.ت',
    },
    nav: {
      home: 'الرئيسية',
      admin: 'القائمة',
    },
    home: {
      title: 'MEss',
      subtitle: 'تقسيم فاتورة المقهى والمطعم بين الأصدقاء بكل سهولة',
      totalSessions: 'إجمالي الجلسات',
      activeNow: 'جلسات جارية الآن',
      emptyTitle: 'لا توجد جلسات حالياً',
      emptyDesc: 'قعدة في مقهى أو مطعم؟ ابدأ جلسة جديدة لتسجيل الطلبات وحساب نصيب كل صديق بالمليم.',
      startFirstSession: 'إنشاء جلسة جديدة',
      scanOcr: 'مسح الفاتورة',
      scanOcrDesc: 'التقط صورة الفاتورة ويتم استخراج الأسعار بالدينار التونسي بالذكاء الاصطناعي.',
      assignPillar: 'توزيع الطلبات',
      assignPillarDesc: 'عيّن كل استهلاك لصاحبه أو قسّم الأطباق المشتركة بدقة.',
      splitPillar: 'حساب دقيق',
      splitPillarDesc: 'حساب عادل لكل فرد مع توزيع منصف للبقشيش.',
      recentSessions: 'الجلسات الأخيرة',
      tapToView: 'اضغط لفتح الجلسة',
      newSessionBtn: 'جلسة جديدة',
    },
    session: {
      back: 'الجلسات',
      active: 'نشطة',
      closed: 'مغلقة',
      openedOn: 'فُتحت في',
      ordersTab: 'الطلبات',
      friendsTab: 'الأصدقاء',
      billTab: 'الحساب',
      unassignedBadge: 'غير موزّع',
      articlesCount: 'طلبات',
      friendsSeated: 'حاضرين',
      splitNet: 'حساب دقيق',
      readOnlyTitle: 'وضع القراءة فقط',
      readOnlyDesc: 'صاحب الجلسة فقط يمكنه التعديل. يمكنك الاطلاع على الحساب ومشاركته.',
      unlock: 'فتح القفل',
      lock: 'قفل 🔒',
      unlockedOrganizer: 'الجلسة مفتوحة (صلاحيات المنظم)',
      organizerBadge: '🔓 المنظم',
      readOnlyBadge: '🔒 قراءة فقط',
      unlockModalTitle: 'فتح قفل الجلسة',
      unlockModalSubtitle: 'أدخل كلمة المرور المحددة من منشئ الجلسة',
      creatorPassword: 'كلمة مرور المنشئ',
      passwordPlaceholder: 'أدخل الرمز السري',
      verifying: 'جارٍ التحقق...',
      unlockAction: 'فتح القفل',
      enterPasswordError: 'يرجى إدخال كلمة المرور',
    },
    orders: {
      title: 'الطلبات والجولات',
      placedCount: 'طلبات مسجلة',
      scanner: 'مسح الفاتورة',
      newOrder: 'طلب جديد',
      noOrders: 'لا توجد طلبات بعد',
      noOrdersDesc: 'التقط صورة للفاتورة لإدخالها فوراً بالذكاء الاصطناعي، أو أضف الطلبات يدوياً!',
      scanButton: 'مسح الفاتورة بالكاميرا (IA Gemini)',
      manualButton: 'طلب يدوي',
      foodSplit: 'أكل / مشترك',
      individual: 'فردي',
      weightPending: 'السعر بالوزن في انتظار الفاتورة',
      fillPrice: 'تحديد السعر',
      adjust: 'تعديل',
      deleteOrder: 'حذف الطلب',
      unassignedItemsNotice: 'غير موزّع — اضغط على من استهلكه :',
      splitWays: 'مشترك بين',
      each: 'لكل شخص',
      allFriendsSeatedNotice: 'أضف أصدقاء من تبويب الأصدقاء لتوزيع هذا الطلب!',
    },
    friends: {
      title: 'الأصدقاء على الطاولة',
      addFriend: 'إضافة صديق',
      noFriends: 'لم تتم إضافة أصدقاء بعد',
      noFriendsDesc: 'أضف الجالسين معك على الطاولة لتوزيع الطلبات والحساب.',
      addFirstFriend: 'إضافة أول صديق',
      friendName: 'اسم الصديق',
      namePlaceholder: 'مثال: محمد، سارة، علي...',
      friendColor: 'اللون',
      adding: 'جارٍ الإضافة...',
      seated: 'انضم في',
      modalTitle: 'إضافة صديق',
      modalSubtitle: 'أضف جليساً جديداً إلى الطاولة',
    },
    bill: {
      whoPaysWhat: 'تفاصيل حساب كل شخص',
      realTimeSplit: 'حساب فوري للمشروبات الفردية والأطباق المشتركة مع البقشيش',
      shareTab: 'مشاركة',
      copied: 'تم النسخ!',
      unassignedAlert: 'غير موزّع على الطاولة!',
      weightAlert: 'عنصر بالوزن بدون سعر محدد (0 د.ت)',
      visualSplit: 'توزيع الحساب على الطاولة',
      totalTable: 'إجمالي الطاولة',
      tip: 'البقشيش',
      addTip: 'إضافة بقشيش',
      tipOptional: 'مبلغ اختياري لخدمة المقهى أو المطعم',
      removeTip: 'حذف البقشيش',
      tipAmount: 'قيمة البقشيش (د.ت)',
      whoTips: 'من يشارك في البقشيش؟',
      all: 'الكل',
      none: 'لا أحد',
      eachTipperPays: 'نصيب كل مشارك :',
      noItems: 'لا توجد طلبات موزعة بعد',
      subtotal: 'المجموع الفرعي',
      unassignedTable: 'غير موزّع على الطاولة',
      grandTotal: 'المجموع الإجمالي',
      closeTab: 'إغلاق الحساب',
      closingTab: 'جارٍ الإغلاق...',
      readOnlyBadge: 'قراءة فقط',
      shareHeader: 'فاتورة وحساب الطاولة',
      shareSubtotal: 'المجموع الفرعي',
      shareTip: 'البقشيش',
      shareGrandTotal: 'المجموع الإجمالي',
      shareUnassigned: 'غير موزّع على الطاولة',
      shareFooter: 'تمت المشاركة عبر MEss 🍺',
    },
    createSession: {
      modalTitle: 'جلسة جديدة',
      modalSubtitle: 'حدد اسم الطاولة والأصدقاء الحاضرين',
      sessionNameLabel: 'اسم الجلسة',
      sessionNamePlaceholder: 'مثال: قعدة الجمعة في المقهى',
      passwordLabel: 'كلمة مرور المنشئ',
      requiredBadge: 'إجباري',
      passwordPlaceholder: 'مثال: 1234 أو رمزك السري',
      passwordHelp: '🔒 أنت فقط من يستطيع إضافة الطلبات أو مسح الفاتورة والتعديل. باقي الأصدقاء يشاهدون الحساب فقط.',
      quickSuggestions: 'اقتراحات سريعة',
      friendsAtTable: 'الأصدقاء على الطاولة',
      friendsHelp: 'يمكنك إضافة المزيد من الأصدقاء في أي وقت',
      createButton: 'إنشاء الجلسة',
      creating: 'جارٍ الإنشاء...',
      nameRequiredError: 'يرجى إدخال اسم للجلسة',
      passwordRequiredError: 'يرجى تحديد كلمة مرور لحماية التعديلات',
      passwordLengthError: 'يجب أن تتكون كلمة المرور من حرفين على الأقل',
    },
  },
  en: {
    common: {
      cancel: 'Cancel',
      confirm: 'Confirm',
      delete: 'Delete',
      open: 'Open',
      close: 'Close',
      save: 'Save',
      edit: 'Edit',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      share: 'Share',
      copied: 'Copied!',
      yes: 'Yes',
      no: 'No',
      back: 'Back',
      deleteConfirm: 'Delete?',
      items: 'items',
      item: 'item',
      dt: 'DT',
    },
    nav: {
      home: 'Home',
      admin: 'Menu',
    },
    home: {
      title: 'MEss',
      subtitle: 'Split bar tabs & cafe bills with friends without the headache',
      totalSessions: 'Total sessions',
      activeNow: 'Active now',
      emptyTitle: 'No active sessions',
      emptyDesc: 'Out at a bar, cafe or restaurant? Start a session to track drinks and split fairly without manual math.',
      startFirstSession: 'Create a Session',
      scanOcr: 'Receipt Scan',
      scanOcrDesc: 'Snap receipt photo, prices in DT are imported automatically via AI.',
      assignPillar: 'Assignment',
      assignPillarDesc: 'Assign individual drinks or split shared food dishes.',
      splitPillar: 'Fair Split',
      splitPillarDesc: 'Exact split down to the millime with fair tip distribution.',
      recentSessions: 'Recent sessions',
      tapToView: 'Tap to open',
      newSessionBtn: 'New Session',
    },
    session: {
      back: 'Sessions',
      active: 'Active',
      closed: 'Closed',
      openedOn: 'Opened on',
      ordersTab: 'Orders',
      friendsTab: 'Friends',
      billTab: 'The Bill',
      unassignedBadge: 'unassigned',
      articlesCount: 'items',
      friendsSeated: 'seated',
      splitNet: 'Split tab',
      readOnlyTitle: 'Read-Only Mode',
      readOnlyDesc: 'Only the creator can edit. You can view and share the tab.',
      unlock: 'Unlock',
      lock: 'Lock 🔒',
      unlockedOrganizer: 'Session unlocked (Organizer access)',
      organizerBadge: '🔓 Organizer',
      readOnlyBadge: '🔒 Read-only',
      unlockModalTitle: 'Unlock Session',
      unlockModalSubtitle: 'Enter creator password to unlock editing',
      creatorPassword: 'Creator Password',
      passwordPlaceholder: 'Enter password',
      verifying: 'Verifying...',
      unlockAction: 'Unlock',
      enterPasswordError: 'Please enter the password',
    },
    orders: {
      title: 'Orders & Rounds',
      placedCount: 'orders placed',
      scanner: 'Scanner',
      newOrder: 'New Order',
      noOrders: 'No orders yet',
      noOrdersDesc: 'Scan receipt photo to import via AI, or add orders manually!',
      scanButton: 'Scan Receipt (Gemini AI)',
      manualButton: 'Manual Order',
      foodSplit: 'Food / Split',
      individual: 'Individual',
      weightPending: 'Price by weight pending receipt',
      fillPrice: 'Set price',
      adjust: 'Adjust',
      deleteOrder: 'Delete order',
      unassignedItemsNotice: 'unassigned — tap who had it:',
      splitWays: 'Split',
      each: 'each',
      allFriendsSeatedNotice: 'Add friends in the Friends tab to assign this dish!',
    },
    friends: {
      title: 'Friends at the Table',
      addFriend: 'Add Friend',
      noFriends: 'No friends added yet',
      noFriendsDesc: 'Add everyone sitting at your table to start splitting.',
      addFirstFriend: 'Add First Friend',
      friendName: "Friend's name",
      namePlaceholder: 'e.g. Alex, Sam...',
      friendColor: 'Color',
      adding: 'Adding...',
      seated: 'Joined at',
      modalTitle: 'Add Friend',
      modalSubtitle: 'Add a new friend to the table',
    },
    bill: {
      whoPaysWhat: 'Who Pays What',
      realTimeSplit: 'Real-time split based on individual & shared items',
      shareTab: 'Share Tab',
      copied: 'Copied!',
      unassignedAlert: 'unassigned on table!',
      weightAlert: 'item(s) by weight without price set (0 DT)',
      visualSplit: 'Bill Split Breakdown',
      totalTable: 'Table Total',
      tip: 'Tip',
      addTip: 'Add a Tip',
      tipOptional: 'Optional gratuity for bar staff',
      removeTip: 'Remove tip',
      tipAmount: 'Tip Amount (DT)',
      whoTips: 'Who contributes to tip?',
      all: 'All',
      none: 'None',
      eachTipperPays: 'Each tipper pays:',
      noItems: 'No items assigned yet',
      subtotal: 'Subtotal',
      unassignedTable: 'Unassigned on table',
      grandTotal: 'Grand Total',
      closeTab: 'Close Tab',
      closingTab: 'Closing...',
      readOnlyBadge: 'Read-only',
      shareHeader: 'Bill & Split',
      shareSubtotal: 'Subtotal',
      shareTip: 'Tip',
      shareGrandTotal: 'Grand Total',
      shareUnassigned: 'Unassigned on table',
      shareFooter: 'Shared via MEss 🍺',
    },
    createSession: {
      modalTitle: 'New Session',
      modalSubtitle: 'Set table name and friends present',
      sessionNameLabel: 'Session Name',
      sessionNamePlaceholder: 'e.g. Friday Drinks at Cosy',
      passwordLabel: 'Creator Password',
      requiredBadge: 'Required',
      passwordPlaceholder: 'e.g. 1234 or your secret PIN',
      passwordHelp: '🔒 Only you can add orders, scan or assign. Other friends will have read-only access.',
      quickSuggestions: 'Quick suggestions',
      friendsAtTable: 'Friends at the table',
      friendsHelp: 'You can add more friends anytime from the Friends tab',
      createButton: 'Create Session',
      creating: 'Creating...',
      nameRequiredError: 'Please enter a session name',
      passwordRequiredError: 'Please set a password to lock modifications',
      passwordLengthError: 'Password must be at least 2 characters',
    },
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  isRTL: boolean;
  dir: 'ltr' | 'rtl';
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'fr',
  setLanguage: () => {},
  t: translations.fr,
  isRTL: false,
  dir: 'ltr',
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('fr');

  useEffect(() => {
    try {
      const saved = (localStorage.getItem('mess-lang') as Language) || 'fr';
      if (saved === 'fr' || saved === 'ar' || saved === 'en') {
        setLanguageState(saved);
        applyLanguageToDOM(saved);
      }
    } catch {}
  }, []);

  const applyLanguageToDOM = (lang: Language) => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    }
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('mess-lang', lang);
    } catch {}
    applyLanguageToDOM(lang);
  };

  const isRTL = language === 'ar';
  const dir = isRTL ? 'rtl' : 'ltr';
  const t = translations[language] || translations.fr;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
