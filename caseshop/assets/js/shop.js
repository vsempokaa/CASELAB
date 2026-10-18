/*
	CaseLab — демо-кошик і події Google Analytics 4 для симуляції воронки продажів:
	view_item → add_to_cart → begin_checkout → purchase (+ generate_lead з форми).
	Нічого нікуди не надсилається, крім подій аналітики.
*/
(function() {

	var products = {
		silicone: { name: 'Силіконовий чохол Soft Touch', price: 499, img: 'images/case-silicone.svg', desc: 'М’який на дотик силікон, мікрофібра всередині, бортик над камерою.' },
		clear:    { name: 'Прозорий протиударний чохол',  price: 399, img: 'images/case-clear.svg',    desc: 'Не жовтіє, посилені кути з повітряними подушками.' },
		book:     { name: 'Шкіряний чохол-книжка',        price: 899, img: 'images/case-book.svg',     desc: 'Натуральна шкіра, кишеня для карток, магнітна застібка.' },
		magsafe:  { name: 'Чохол MagSafe',                price: 699, img: 'images/case-magsafe.svg',  desc: 'Вбудовані магніти для бездротової зарядки та тримачів.' },
		print:    { name: 'Дизайнерський чохол з принтом', price: 549, img: 'images/case-print.svg',   desc: 'Авторські принти, стійкі до стирання, матове покриття.' },
		armor:    { name: 'Протиударний чохол Armor',     price: 599, img: 'images/case-armor.svg',    desc: 'Подвійний шар TPU + PC, захист від падіння з 2 метрів.' }
	};

	var modal = document.getElementById('shop-modal'),
		cart = [],
		current = null;

	// Відправка події в GA4 (і в консоль — зручно перевіряти).
	function track(name, params) {
		console.log('[GA4]', name, params || {});
		if (typeof gtag === 'function') gtag('event', name, params || {});
	}

	function item(id, p, variant) {
		return { item_id: id, item_name: p.name, item_variant: variant, price: p.price, quantity: 1 };
	}

	function total() {
		return cart.reduce(function(sum, i) { return sum + i.price; }, 0);
	}

	function show(step) {
		modal.hidden = false;
		document.body.classList.add('modal-open');
		modal.querySelectorAll('.step').forEach(function(s) { s.hidden = s.dataset.step !== step; });
	}

	function close() {
		modal.hidden = true;
		document.body.classList.remove('modal-open');
	}

	function renderCart() {
		document.querySelectorAll('.cart-count').forEach(function(el) { el.textContent = cart.length; });
		modal.querySelector('.cart-list').innerHTML = cart.length
			? cart.map(function(i) { return '<li>' + i.item_name + ' <small>(' + i.item_variant + ')</small> — ' + i.price + ' ₴</li>'; }).join('')
			: '<li>Кошик порожній</li>';
		modal.querySelector('.cart-total').textContent = 'Разом: ' + total() + ' ₴';
		modal.querySelector('[data-action="checkout"]').disabled = !cart.length;
	}

	function openProduct(id) {
		var p = products[id];
		if (!p) return;
		current = id;
		modal.querySelector('.modal-img').src = p.img;
		modal.querySelector('.modal-img').alt = p.name;
		modal.querySelector('.modal-name').textContent = p.name;
		modal.querySelector('.modal-desc').textContent = p.desc;
		modal.querySelector('.modal-price').textContent = p.price + ' ₴';
		show('product');
		track('view_item', { currency: 'UAH', value: p.price, items: [item(id, p)] });
	}

	function openCart() {
		renderCart();
		show('cart');
		track('view_cart', { currency: 'UAH', value: total(), items: cart });
	}

	// Перехоплюємо кліки до обробника шаблону (фаза capture), щоб плитки відкривали картку товару.
	document.addEventListener('click', function(e) {
		var tile = e.target.closest('.tiles > article'),
			cartBtn = e.target.closest('[data-open-cart]');

		if (tile) {
			e.preventDefault();
			e.stopPropagation();
			openProduct(tile.dataset.id);
		}
		else if (cartBtn) {
			e.preventDefault();
			e.stopPropagation();
			document.body.classList.remove('is-menu-visible');
			openCart();
		}
	}, true);

	modal.addEventListener('click', function(e) {
		var btn = e.target.closest('[data-action]');

		if (e.target === modal || e.target.closest('.modal-close')) return close();
		if (!btn) return;

		switch (btn.dataset.action) {
			case 'add':
				var p = products[current],
					it = item(current, p, document.getElementById('phone-model').value);
				cart.push(it);
				track('add_to_cart', { currency: 'UAH', value: p.price, items: [it] });
				renderCart();
				show('cart');
				break;

			case 'checkout':
				track('begin_checkout', { currency: 'UAH', value: total(), items: cart });
				show('checkout');
				break;

			case 'purchase':
				track('purchase', {
					transaction_id: 'DEMO-' + Date.now(),
					currency: 'UAH',
					value: total(),
					shipping: total() >= 800 ? 0 : 70,
					items: cart
				});
				cart = [];
				renderCart();
				show('done');
				break;

			case 'close':
				close();
				break;
		}
	});

	document.addEventListener('keydown', function(e) {
		if (e.key === 'Escape' && !modal.hidden) close();
	});

	// Демо-форма підбору чохла → подія generate_lead.
	document.getElementById('lead-form').addEventListener('submit', function(e) {
		e.preventDefault();
		track('generate_lead', { form: 'pick_case' });
		this.querySelector('.form-result').hidden = false;
		this.reset();
	});

	// Клік по CTA-кнопках — окрема подія, щоб бачити, які кнопки працюють.
	document.querySelectorAll('.cta[href]').forEach(function(a) {
		a.addEventListener('click', function() { track('cta_click', { label: a.textContent.trim() }); });
	});

	renderCart();

})();
