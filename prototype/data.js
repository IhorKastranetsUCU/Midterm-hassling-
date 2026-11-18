window.HustleCourses = [
  { id: 'probability', name: 'Теорія ймовірностей', short: 'Ймовірності', initials: 'P', color: 'butter', topic: 'Умовна ймовірність', deadline: 'Колоквіум', date: '20 листопада', materials: [
    { title: 'Умовна ймовірність', type: 'Конспект', body: 'Якщо відомо, що подія B відбулася, простір можливих результатів звужується до B. Ймовірність події A в цьому просторі — це P(A | B).', formula: 'P(A | B) = P(A ∩ B) / P(B),  P(B) > 0', detail: 'Наприклад, на кубику випало парне число. Серед можливих результатів 2, 4, 6 тільки один — шістка. Тому умовна ймовірність дорівнює 1/3.' },
    { title: 'Незалежні події', type: 'Означення', body: 'Події A та B незалежні, якщо знання про одну з них не змінює ймовірності іншої.', formula: 'P(A ∩ B) = P(A) · P(B)', detail: 'Для незалежних подій з P(B) > 0 маємо P(A | B) = P(A). Незалежність не означає несумісність.' },
    { title: 'Практичне заняття №4', type: 'Практика', body: 'Кидають правильний кубик. Відомо, що результат більший за 3. Знайди ймовірність парного результату.', formula: 'B = {4, 5, 6},  A ∩ B = {4, 6}', detail: 'З трьох можливих результатів два парні. Відповідь: 2/3.' }
  ], cards: [
    ['Що означає P(A | B)?', 'Ймовірність події A за умови, що подія B вже відбулася.'],
    ['Як обчислити умовну ймовірність?', 'P(A | B) = P(A ∩ B) / P(B), якщо P(B) > 0.'],
    ['Коли події A і B незалежні?', 'Коли P(A ∩ B) = P(A) · P(B).']
  ], example: ['На кубику випало число, більше за 3. Яка ймовірність, що воно парне?', 'Можливі результати: 4, 5, 6. Парні серед них: 4 і 6. Отже, P = 2/3.'], quiz: [
    { q: 'На кубику випало парне число. Яка ймовірність, що це шістка?', options: ['1/6','1/3','1/2'], answer: 1, explanation: 'Серед трьох парних граней — 2, 4, 6 — лише одна шістка.' },
    { q: 'P(A ∩ B) = 0,2; P(B) = 0,5. Чому дорівнює P(A | B)?', options: ['0,1','0,7','0,4'], answer: 2, explanation: 'За означенням: 0,2 / 0,5 = 0,4.' },
    { q: 'Події A та B незалежні, P(A) = 0,3 і P(B) > 0. Знайди P(A | B).', options: ['0,3','0','Залежить від P(B)'], answer: 0, explanation: 'Для незалежних подій знання про B не змінює ймовірності A.' }
  ] },
  { id: 'algebra', name: 'Лінійна алгебра', short: 'Алгебра', initials: 'A', color: 'lilac', topic: 'Базис і розмірність', deadline: 'Практичне заняття', date: '19 листопада', materials: [
    { title: 'Базис векторного простору', type: 'Конспект', body: 'Базис — це лінійно незалежна система векторів, яка породжує весь простір.', formula: 'v = a₁e₁ + … + aₙeₙ', detail: 'Кожен вектор має єдиний розклад за заданим базисом. Кількість векторів у базисі дорівнює розмірності простору.' },
    { title: 'Лінійна незалежність', type: 'Означення', body: 'Вектори лінійно незалежні, якщо їхня лінійна комбінація дорівнює нулю тільки за нульових коефіцієнтів.', formula: 'a₁v₁ + … + aₙvₙ = 0 ⇒ a₁ = … = aₙ = 0', detail: 'Вектори (1,0) і (0,1) незалежні, а (1,0) і (2,0) — залежні.' }
  ], cards: [['Що таке базис?', 'Лінійно незалежна система векторів, що породжує простір.'],['Що таке розмірність?', 'Кількість векторів у будь-якому базисі простору.'],['Яка розмірність R²?', 'Два. Наприклад, базис утворюють (1,0) і (0,1).']], example: ['Чи утворюють (1,0) і (1,1) базис R²?', 'Так. Вони лінійно незалежні, оскільки визначник матриці з цих векторів дорівнює 1. Два незалежні вектори утворюють базис R².'], quiz: [
    { q:'Яка розмірність R³?',options:['2','3','4'],answer:1,explanation:'Стандартний базис складається з трьох векторів.' },
    { q:'Вектори (1,0) і (2,0) —',options:['Незалежні','Залежні','Ортогональні'],answer:1,explanation:'Другий вектор дорівнює першому, помноженому на 2.' },
    { q:'Скільки розкладів за заданим базисом має вектор?',options:['Один','Два','Безліч'],answer:0,explanation:'Лінійна незалежність базису забезпечує єдиність розкладу.' }
  ] },
  { id:'english', name:'Академічна англійська', short:'Англійська', initials:'En', color:'blush', topic:'Academic writing', deadline:'Есе', date:'20 листопада', materials:[
    { title:'Thesis statement',type:'Конспект',body:'A thesis statement presents the central claim of an essay. It should be specific and supported by the paragraphs that follow.',formula:'Claim + scope + supporting reasons',detail:'Example: Regular retrieval practice improves long-term recall by requiring learners to reconstruct knowledge.' },
    { title:'Paraphrasing',type:'Практика',body:'Paraphrasing expresses an idea in your own words and sentence structure while preserving its meaning.',formula:'Understand → rewrite → cite',detail:'A paraphrase still needs a citation when the idea comes from another source.' }
  ],cards:[['What is a thesis statement?','The central claim an essay develops and supports.'],['Does a paraphrase need a citation?','Yes, when the idea comes from another source.'],['What is a topic sentence?','A sentence that expresses the main idea of a paragraph.']],example:['Which thesis is more specific: “Education is important” or “Weekly feedback helps students revise their essays”?','The second statement identifies a practice, an audience, and an outcome that can be supported with evidence.'],quiz:[
    {q:'A thesis statement should be…',options:['Specific','Unrelated to the essay','Only a question'],answer:0,explanation:'A specific claim helps structure the argument.'},
    {q:'When paraphrasing a source, you should…',options:['Keep every word','Cite the source','Omit the meaning'],answer:1,explanation:'The source of an idea should be acknowledged even when you use your own words.'},
    {q:'A topic sentence introduces…',options:['The bibliography','A page number','The paragraph’s main idea'],answer:2,explanation:'It helps the reader understand what the paragraph develops.'}
  ] }
];
