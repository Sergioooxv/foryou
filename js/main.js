/* ===== PÉTALOS ===== */
function createPetals() {
    // Si la persona tiene activado "reducir movimiento", no los creamos
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const container = document.getElementById("petals");
    if (!container) return;

    const palette = [
        ["#F1D6CF", "#D99A8C"],
        ["#E9C9C0", "#B86B5E"],
        ["#F6E3DC", "#C98476"],
        ["#D7A3A0", "#7A2E3A"]
    ];

    const count = window.innerWidth < 600 ? 12 : 22; // menos en móvil

    for (let i = 0; i < count; i++) {
        const p = document.createElement("span");
        const [c1, c2] = palette[Math.floor(Math.random() * palette.length)];

        p.className = "petal";
        p.style.left = `${Math.random() * 100}%`;
        p.style.setProperty("--size", `${8 + Math.random() * 10}px`);
        p.style.setProperty("--dur", `${12 + Math.random() * 12}s`);
        p.style.setProperty("--delay", `${-Math.random() * 20}s`); // negativo = ya caen al cargar
        p.style.setProperty("--drift", `${(Math.random() - 0.3) * 180}px`);
        p.style.setProperty("--spin", `${(Math.random() > 0.5 ? 1 : -1) * (300 + Math.random() * 400)}deg`);
        p.style.setProperty("--alpha", (0.35 + Math.random() * 0.45).toFixed(2));
        p.style.setProperty("--c1", c1);
        p.style.setProperty("--c2", c2);

        container.appendChild(p);
    }
}

/* ===== ABRIR LA CARTA ===== */
function setupSobre() {
    const wrap = document.getElementById("sobreWrap");
    const sobre = document.getElementById("sobre");
    const carta = document.querySelector(".carta");
    if (!wrap || !sobre || !carta) return;

    const sinAnimaciones = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const esperar = (ms) => new Promise((r) => setTimeout(r, sinAnimaciones ? 0 : ms));

    sobre.addEventListener("click", async () => {
        if (sobre.classList.contains("abierto")) return; // evita doble clic

        // 1. Se rompe el sello, se abre la solapa y sale el papel
        sobre.classList.add("abierto");
        wrap.classList.add("abierto");
        window.reproductor?.play();
        await esperar(2100);

        // 2. El sobre se va
        wrap.classList.add("fuera");
        await esperar(600);
        wrap.remove();

        // 3. Aparece la carta desplegándose
        carta.hidden = false;
        ["razones", "beso", "cupones"].forEach((id) => document.getElementById(id)?.removeAttribute("hidden"));
        carta.classList.add("desplegando");
        carta.addEventListener("animationend", () => carta.classList.remove("desplegando"), { once: true });

        // Subimos hasta la carta dejando hueco para que se vea el sello
        const y = carta.getBoundingClientRect().top + window.scrollY - 70;
        window.scrollTo({ top: y, behavior: sinAnimaciones ? "auto" : "smooth" });
    });
}

/* ===== GUARDAR / IMPRIMIR LA CARTA ===== */
function setupImprimir() {
    const btn = document.getElementById("btnImprimir");
    if (!btn) return;

    const tituloOriginal = document.title;

    // El título de la página es el nombre que sale al guardar el PDF
    window.addEventListener("beforeprint", () => {
        document.title = document.body.classList.contains("imprimiendo-cupones") ? "Cupones para Leyre" : "Carta para Leyre";
    });
    window.addEventListener("afterprint", () => { document.title = tituloOriginal; });

    btn.addEventListener("click", () => window.print());
}

/* ===== REPRODUCTOR FLOTANTE ===== */
// Cambia aquí tus canciones. "cover" es opcional (una imagen cuadrada).
const playlist = [
    { title: "Just Like Heaven", artist: "Olivia Rodrigo", src: "music/cancion1.mp3"  /*, cover: "img/portada1.jpg" */ },
    { title: "Hungry Eyes", artist: "Eric Carmen", src: "music/cancion2.mp3" },
    { title: "Friday I’m in Love", artist: "Olivia Rodrigo, Robert Smith", src: "music/cancion3.mp3" },
    { title: "Canción 4", artist: "Artista 4", src: "music/cancion4.mp3" },
    { title: "Canción 5", artist: "Artista 5", src: "music/cancion5.mp3" },
    { title: "Canción 6", artist: "Artista 6", src: "music/cancion6.mp3" },
    { title: "Canción 7", artist: "Artista 7", src: "music/cancion7.mp3" },
    { title: "Canción 8", artist: "Artista 8", src: "music/cancion8.mp3" },
    { title: "Canción 9", artist: "Artista 9", src: "music/cancion9.mp3" },
    { title: "Canción 10", artist: "Artista 10", src: "music/cancion10.mp3" }
];

function setupReproductor() {
    const player = document.getElementById("player");
    if (!player) return;

    const audio = document.getElementById("playerAudio");
    const titleEl = document.getElementById("playerTitle");
    const artistEl = document.getElementById("playerArtist");
    const disc = document.getElementById("playerDisc");
    const playBtn = document.getElementById("playerPlay");
    const prevBtn = document.getElementById("playerPrev");
    const nextBtn = document.getElementById("playerNext");
    const seek = document.getElementById("playerSeek");
    const timeEl = document.getElementById("playerTime");
    const listEl = document.getElementById("playerList");
    const listBtn = document.getElementById("playerListBtn");
    const closeBtn = document.getElementById("playerPanelClose");
    const minBtn = document.getElementById("playerMin");
    const cover = document.getElementById("playerCover");
    const volSliders = player.querySelectorAll(".player-vol");
    const muteBtns = player.querySelectorAll(".player-mute");

    let index = 0;
    let arrastrando = false;
    let duracionesCargadas = false;

    const formato = (s) => {
        if (!Number.isFinite(s)) return "0:00";
        return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
    };

    const pintarRelleno = (input) => {
        const pct = ((input.value - input.min) / (input.max - input.min)) * 100;
        input.style.setProperty("--relleno", `${pct}%`);
    };

    /* ----- Lista ----- */
    function pintarLista() {
        listEl.innerHTML = "";
        playlist.forEach((song, i) => {
            const li = document.createElement("li");
            li.tabIndex = 0;
            li.setAttribute("role", "button");

            const thumb = document.createElement("span");
            thumb.className = "player-thumb";
            if (song.cover) thumb.style.backgroundImage = `url("${song.cover}")`;
            else thumb.textContent = i + 1;
            thumb.insertAdjacentHTML("beforeend", '<span class="player-eq"><i></i><i></i><i></i></span>');

            const texto = document.createElement("span");
            texto.className = "player-list__texto";
            const t = document.createElement("p");
            t.className = "player-list__titulo";
            t.textContent = song.title;
            const a = document.createElement("p");
            a.className = "player-list__artista";
            a.textContent = song.artist;
            texto.append(t, a);

            const dur = document.createElement("span");
            dur.className = "player-list__dur";
            dur.textContent = "--:--";

            li.append(thumb, texto, dur);

            const elegir = () => {
                if (i === index) { audio.paused ? reproducir() : audio.pause(); return; }
                cargar(i);
                reproducir();
            };
            li.addEventListener("click", elegir);
            li.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); elegir(); }
            });

            listEl.appendChild(li);
        });
    }

    // Lee la duración de cada canción (solo la primera vez que se abre la lista)
    function cargarDuraciones() {
        if (duracionesCargadas) return;
        duracionesCargadas = true;
        playlist.forEach((song, i) => {
            const a = new Audio();
            a.preload = "metadata";
            a.src = song.src;
            a.addEventListener("loadedmetadata", () => {
                listEl.children[i].querySelector(".player-list__dur").textContent = formato(a.duration);
            });
        });
    }

    function marcarActiva() {
        [...listEl.children].forEach((li, i) => li.classList.toggle("activa", i === index));
    }

    /* ----- Reproducción ----- */
    function cargar(i) {
        index = (i + playlist.length) % playlist.length;
        const song = playlist[index];
        audio.src = song.src;
        titleEl.textContent = song.title;
        artistEl.textContent = song.artist;
        disc.style.setProperty("--portada", song.cover ? `url("${song.cover}")` : "linear-gradient(135deg, var(--color-principal), var(--color-secundario))");
        seek.value = 0;
        pintarRelleno(seek);
        timeEl.textContent = "0:00 / 0:00";
        marcarActiva();

        if ("mediaSession" in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: song.title,
                artist: song.artist,
                artwork: song.cover ? [{ src: song.cover, sizes: "512x512" }] : []
            });
        }
    }

    function reproducir() {
        const p = audio.play();
        if (p) p.catch(() => { });
    }

    playBtn.addEventListener("click", () => (audio.paused ? reproducir() : audio.pause()));
    prevBtn.addEventListener("click", () => {
        if (audio.currentTime > 3) { audio.currentTime = 0; return; }
        cargar(index - 1);
        reproducir();
    });
    nextBtn.addEventListener("click", () => { cargar(index + 1); reproducir(); });

    audio.addEventListener("play", () => player.classList.add("sonando"));
    audio.addEventListener("pause", () => player.classList.remove("sonando"));
    audio.addEventListener("ended", () => { cargar(index + 1); reproducir(); });

    audio.addEventListener("timeupdate", () => {
        if (!audio.duration || arrastrando) return;
        seek.value = (audio.currentTime / audio.duration) * 100;
        pintarRelleno(seek);
        timeEl.textContent = `${formato(audio.currentTime)} / ${formato(audio.duration)}`;
    });

    audio.addEventListener("loadedmetadata", () => {
        timeEl.textContent = `0:00 / ${formato(audio.duration)}`;
    });

    seek.addEventListener("input", () => {
        arrastrando = true;
        pintarRelleno(seek);
        if (audio.duration) timeEl.textContent = `${formato((seek.value / 100) * audio.duration)} / ${formato(audio.duration)}`;
    });
    seek.addEventListener("change", () => {
        if (audio.duration) audio.currentTime = (seek.value / 100) * audio.duration;
        arrastrando = false;
    });

    /* ----- Volumen ----- */
    let volumenAntes = 0.8;

    function aplicarVolumen(v) {
        audio.volume = v;
        audio.muted = v === 0;
        volSliders.forEach((s) => { s.value = v; pintarRelleno(s); });
        const nivel = v === 0 ? "mute" : v < 0.5 ? "bajo" : "alto";
        muteBtns.forEach((b) => {
            b.dataset.nivel = nivel;
            b.setAttribute("aria-label", v === 0 ? "Activar sonido" : "Silenciar");
        });
        try { localStorage.setItem("carta-volumen", v); } catch (e) { }
    }

    volSliders.forEach((s) => s.addEventListener("input", () => aplicarVolumen(parseFloat(s.value))));

    muteBtns.forEach((b) => b.addEventListener("click", () => {
        if (audio.volume > 0 && !audio.muted) {
            volumenAntes = audio.volume;
            aplicarVolumen(0);
        } else {
            aplicarVolumen(volumenAntes || 0.8);
        }
    }));

    // iPhone no deja cambiar el volumen desde la web: escondemos el slider
    const prueba = new Audio();
    prueba.volume = 0.5;
    if (prueba.volume !== 0.5) player.classList.add("sin-volumen");

    let volGuardado = 0.8;
    try {
        const v = parseFloat(localStorage.getItem("carta-volumen"));
        if (Number.isFinite(v)) volGuardado = v;
    } catch (e) { }
    aplicarVolumen(volGuardado);

    /* ----- Panel y minimizar ----- */
    function abrirLista(abrir) {
        player.classList.toggle("lista-abierta", abrir);
        listBtn.classList.toggle("activo", abrir);
        listBtn.setAttribute("aria-expanded", abrir);
        if (abrir) {
            cargarDuraciones();
            listEl.children[index]?.scrollIntoView({ block: "nearest" });
        }
    }

    listBtn.addEventListener("click", () => abrirLista(!player.classList.contains("lista-abierta")));
    closeBtn.addEventListener("click", () => abrirLista(false));

    cover.addEventListener("click", () => {
        if (player.classList.contains("mini")) {
            player.classList.remove("mini");
            cover.setAttribute("aria-label", "Ver lista de canciones");
        } else {
            abrirLista(!player.classList.contains("lista-abierta"));
        }
    });

    minBtn.addEventListener("click", () => {
        abrirLista(false);
        player.classList.add("mini");
        cover.setAttribute("aria-label", "Abrir reproductor");
    });

    // Cerrar la lista al tocar fuera
    document.addEventListener("click", (e) => {
        if (player.classList.contains("lista-abierta") && !player.contains(e.target)) abrirLista(false);
    });

    /* ----- Botones de la pantalla de bloqueo (móvil) ----- */
    if ("mediaSession" in navigator) {
        navigator.mediaSession.setActionHandler("play", reproducir);
        navigator.mediaSession.setActionHandler("pause", () => audio.pause());
        navigator.mediaSession.setActionHandler("previoustrack", () => { cargar(index - 1); reproducir(); });
        navigator.mediaSession.setActionHandler("nexttrack", () => { cargar(index + 1); reproducir(); });
    }

    pintarLista();
    cargar(0);

    // Para poder darle al play desde otras partes (por ejemplo, al abrir el sobre)
    window.reproductor = { play: reproducir };
}













































/* ===== TARRO DE RAZONES ===== */
// ✍️ Escribe aquí tus razones (pon todas las que quieras)
const razones = [
    "Tus ojazos, sobre todo cuando me miras después de un beso muy, muy largo.",
    "Tu sonrisa, que es la culpable de la mía.",
    "Que contigo puedo ser yo, sin disimular nada.",
    "Cómo me haces sentir: querido, cuidado y protegido.",
    "Que me pidas abrazos como si fueran lo más normal del mundo.",
    "Que cada «te echo de menos» tuyo me alegre el día entero.",
    "Lo bien que nos reímos juntos, incluso de tonterías.",
    "Que me corrijas cuando digo tortitas (son crepes, ya lo sé).",
    "Que mantengas viva la racha… y la otra llama también.",
    "Que sobrevivimos al «exilio» a Francia a base de FaceTime.",
    "Que seas mi Dictadora favorita 😉",
    "Que cada plan contigo, por pequeño que sea, se convierte en el mejor del día."
];

function setupRazones() {
    const tarro = document.getElementById("tarro");
    if (!tarro) return;

    const papelesEl = document.getElementById("tarroPapeles");
    const nota = document.getElementById("razonNota");
    const texto = document.getElementById("razonTexto");
    const num = document.getElementById("razonNum");
    const contador = document.getElementById("razonContador");
    const reiniciar = document.getElementById("razonReiniciar");

    const colores = ["#F6E3DC", "#E9C9C0", "#FAF6F1", "#F1D6CF", "#EBC1B6"];
    const sinAnimaciones = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let orden = [];
    let pos = 0;
    let ocupado = false;

    // Baraja las razones para que salgan en orden aleatorio y sin repetir
    function barajar() {
        orden = razones.map((_, i) => i);
        for (let i = orden.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [orden[i], orden[j]] = [orden[j], orden[i]];
        }
        pos = 0;
    }

    // Dibuja los papelitos que quedan dentro del tarro
    function pintarPapeles() {
        const quedan = Math.min(razones.length - pos, 20);
        papelesEl.innerHTML = "";
        for (let i = 0; i < quedan; i++) {
            const p = document.createElement("span");
            p.className = "papelito";
            const fila = Math.floor(i / 5);
            const col = i % 5;
            p.style.left = `${10 + col * 32 + (Math.random() * 8 - 4)}px`;
            p.style.bottom = `${10 + fila * 17 + (Math.random() * 6 - 3)}px`;
            p.style.transform = `rotate(${Math.random() * 50 - 25}deg)`;
            p.style.setProperty("--c", colores[i % colores.length]);
            papelesEl.appendChild(p);
        }
    }

    function actualizarContador() {
        contador.textContent = pos === 0
            ? `Hay ${razones.length} papelitos esperándote`
            : `Razón ${pos} de ${razones.length}`;
    }

    // Animación del papel saliendo del tarro hacia la nota
    function papelVuela() {
        if (sinAnimaciones) return Promise.resolve();
        const desde = tarro.getBoundingClientRect();
        const hasta = nota.getBoundingClientRect();
        const papel = document.createElement("span");
        papel.className = "papel-volando";
        papel.style.left = `${desde.left + desde.width / 2 - 17}px`;
        papel.style.top = `${desde.top + 20}px`;
        document.body.appendChild(papel);

        const dx = hasta.left + hasta.width / 2 - (desde.left + desde.width / 2);
        const dy = hasta.top + 30 - (desde.top + 20);

        return papel.animate([
            { transform: "translate(0, 0) rotate(0) scale(1)", opacity: 1 },
            { transform: `translate(${dx * 0.4}px, -90px) rotate(200deg) scale(1.3)`, opacity: 1, offset: 0.45 },
            { transform: `translate(${dx}px, ${dy}px) rotate(380deg) scale(2.2)`, opacity: 0 }
        ], { duration: 750, easing: "cubic-bezier(.3, .7, .4, 1)" }).finished.then(() => papel.remove());
    }

    async function sacarRazon() {
        if (ocupado) return;

        // Tarro vacío: solo se agita
        if (pos >= razones.length) {
            tarro.classList.remove("agitando");
            void tarro.offsetWidth;
            tarro.classList.add("agitando");
            return;
        }

        ocupado = true;
        tarro.classList.remove("agitando");
        void tarro.offsetWidth; // reinicia la animación
        tarro.classList.add("agitando");

        const indice = orden[pos];
        pos++;
        pintarPapeles();

        nota.classList.remove("visible");
        await papelVuela();

        num.textContent = `#${pos}`;
        texto.textContent = razones[indice];
        void nota.offsetWidth;
        nota.classList.add("visible");
        actualizarContador();

        if (pos >= razones.length) {
            contador.textContent = "Se acabaron los papelitos… pero no las razones. Esas son como el sumatorio: no tienen fin ♥";
            reiniciar.hidden = false;
        }

        ocupado = false;
    }

    tarro.addEventListener("click", sacarRazon);

    reiniciar.addEventListener("click", () => {
        barajar();
        pintarPapeles();
        nota.classList.remove("visible");
        reiniciar.hidden = true;
        actualizarContador();
    });

    barajar();
    pintarPapeles();
    actualizarContador();
}

/* ===== LLUVIA DE CORAZONES (se usa en el beso) ===== */
function lluviaCorazones(origen, cantidad = 24) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = origen.getBoundingClientRect();
    const colores = ["#7A2E3A", "#B86B5E", "#E9C9C0", "#D99A8C"];

    for (let i = 0; i < cantidad; i++) {
        const c = document.createElement("span");
        c.textContent = Math.random() > 0.3 ? "♥" : "💋";
        Object.assign(c.style, {
            position: "fixed",
            left: `${r.left + r.width / 2}px`,
            top: `${r.top + r.height / 2}px`,
            color: colores[i % colores.length],
            fontSize: `${14 + Math.random() * 18}px`,
            pointerEvents: "none",
            zIndex: 60
        });
        document.body.appendChild(c);

        const ang = Math.random() * Math.PI * 2;
        const dist = 80 + Math.random() * 160;
        c.animate([
            { transform: "translate(-50%, -50%) scale(.3)", opacity: 1 },
            { transform: `translate(calc(-50% + ${Math.cos(ang) * dist}px), calc(-50% + ${Math.sin(ang) * dist - 60}px)) scale(1) rotate(${Math.random() * 60 - 30}deg)`, opacity: 0 }
        ], { duration: 1100 + Math.random() * 600, easing: "cubic-bezier(.22,.8,.24,1)" }).onfinish = () => c.remove();
    }
}

/* ===== ¿ME DAS UN BESO? ===== */
function setupBeso() {
    const zona = document.getElementById("besoZona");
    if (!zona) return;

    const si = document.getElementById("besoSi");
    const no = document.getElementById("besoNo");
    const pregunta = document.getElementById("besoPregunta");
    const respuesta = document.getElementById("besoRespuesta");

    // Lo que va diciendo el botón "No" cada vez que se escapa
    const frasesNo = [
        "¿Seguro?",
        "Piénsalo bien…",
        "Nop 🙃",
        "Error 404: «No» no encontrado",
        "Inténtalo otra vez 😏",
        "Casi…",
        "Que no, Dictadora",
        "Vale, sí 🙈"
    ];

    let intentos = 0;

    function escapar(e) {
        if (e) e.preventDefault();

        // Al final el "No" se rinde y se convierte en un "Sí"
        if (intentos >= frasesNo.length - 1) {
            no.textContent = frasesNo[frasesNo.length - 1];
            no.classList.add("rendido");
            return;
        }

        no.textContent = frasesNo[intentos];
        intentos++;

        // El "Sí" crece un poco cada vez
        si.style.setProperty("--crece", 1 + intentos * 0.1);

        // Mover el "No" a un sitio aleatorio dentro de la zona
        no.classList.add("huyendo");
        const maxX = zona.clientWidth - no.offsetWidth;
        const maxY = zona.clientHeight - no.offsetHeight;
        const z = zona.getBoundingClientRect();
        const s = si.getBoundingClientRect();

        // Busca un sitio que no tape el botón "Sí"
        let x, y;
        for (let k = 0; k < 15; k++) {
            x = Math.random() * maxX;
            y = Math.random() * maxY;
            const m = 30; // margen, porque el "Sí" va creciendo
            const tapa = x < s.right - z.left + m && x + no.offsetWidth > s.left - z.left - m &&
                y < s.bottom - z.top + m && y + no.offsetHeight > s.top - z.top - m;
            if (!tapa) break;
        }
        no.style.left = `${x}px`;
        no.style.top = `${y}px`;
    }

    function decirQueSi() {
        lluviaCorazones(si);
        zona.hidden = true;
        pregunta.textContent = "¡Sí! 😚";
        respuesta.hidden = false;
        try { localStorage.setItem("carta-beso", "si"); } catch (err) { }
        desbloquearCupones(true);
    }

    // Ratón: se escapa al acercarse. Móvil: se escapa al tocarlo.
    no.addEventListener("mouseenter", () => { if (!no.classList.contains("rendido")) escapar(); });
    no.addEventListener("touchstart", (e) => { if (!no.classList.contains("rendido")) escapar(e); }, { passive: false });
    no.addEventListener("click", (e) => {
        if (no.classList.contains("rendido")) decirQueSi();
        else escapar(e);
    });

    si.addEventListener("click", decirQueSi);

    // Si ya dijo que sí otro día, se queda así
    try {
        if (localStorage.getItem("carta-beso") === "si") {
            zona.hidden = true;
            pregunta.textContent = "¡Sí! 😚";
            respuesta.hidden = false;
            desbloquearCupones(false);
        }
    } catch (err) { }
}

/* ===== CUPONES ===== */
// ✍️ Cambia o añade los cupones que quieras
const cupones = [
    { icono: "🤗", titulo: "Un abrazo de 10 minutos sin soltarte", letra: "Ampliable a 20 si hace frío." },
    { icono: "💋", titulo: "Un beso muy, muy largo", letra: "De esos en los que me da rabia no poder parar el tiempo." },
    { icono: "🥞", titulo: "Unos crepes (que no tortitas)", letra: "Tú eliges el sitio. Yo invito." },
    { icono: "🥡", titulo: "Una cena en el Little Dragon", letra: "Incluye repetir plato sin juzgar." },
    { icono: "🕹️", titulo: "Una tarde de arcade", letra: "Te dejo ganar… o no." },
    { icono: "🎬", titulo: "Una peli elegida por ti", letra: "Sin quejas. Ni una. Prometido." },
    { icono: "🧸", titulo: "Un día de mimos ilimitados", letra: "Sin horario de cierre." },
    { icono: "👑", titulo: "Un «tienes razón»", letra: "Uso excepcional, Dictadora. Úsalo con cabeza 😉" }
];

// Si pones tu número (con prefijo, sin + ni espacios, ej: "34600000000"),
// al canjear se abrirá WhatsApp con un mensaje para ti. Si lo dejas vacío, solo se sella.
const WHATSAPP = "";

function desbloquearCupones(conScroll) {
    const sec = document.getElementById("cupones");
    if (!sec) return;
    sec.classList.remove("bloqueado");
    if (conScroll) {
        setTimeout(() => sec.scrollIntoView({ behavior: "smooth", block: "start" }), 1800);
    }
}

function setupCupones() {
    const grid = document.getElementById("cuponesGrid");
    if (!grid) return;

    let canjeados = {};
    try { canjeados = JSON.parse(localStorage.getItem("carta-cupones")) || {}; } catch (e) { }

    const guardar = () => {
        try { localStorage.setItem("carta-cupones", JSON.stringify(canjeados)); } catch (e) { }
    };

    cupones.forEach((c, i) => {
        const num = String(i + 1).padStart(2, "0");
        const el = document.createElement("article");
        el.className = "cupon";
        el.innerHTML = `
            <div class="cupon__ticket">
                <div class="cupon__cuerpo">
                    <span class="cupon__icono"></span>
                    <p class="cupon__vale">Vale por</p>
                    <h3 class="cupon__titulo"></h3>
                    <p class="cupon__letra"></p>
                    <button class="cupon__canjear" type="button">Canjear</button>
                    <button class="cupon__deshacer" type="button">Deshacer</button>
                    <div class="cupon__sello">CANJEADO<small></small></div>
                </div>
                <div class="cupon__talon">
                    <span class="cupon__talon-txt">Nº</span>
                    <span class="cupon__talon-num">${num}</span>
                    <span class="cupon__talon-txt">Vale</span>
                </div>
            </div>`;

        el.querySelector(".cupon__icono").textContent = c.icono;
        el.querySelector(".cupon__titulo").textContent = c.titulo;
        el.querySelector(".cupon__letra").textContent = c.letra;
        const fechaEl = el.querySelector(".cupon__sello small");

        if (canjeados[i]) {
            el.classList.add("canjeado");
            fechaEl.textContent = canjeados[i];
        }

        el.querySelector(".cupon__canjear").addEventListener("click", () => {
            const fecha = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" });
            canjeados[i] = fecha;
            guardar();
            fechaEl.textContent = fecha;
            el.classList.add("canjeado");

            if (WHATSAPP) {
                const msg = `Hola amor 😏 Quiero canjear mi cupón Nº ${num}: «${c.titulo}»`;
                window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`, "_blank");
            }
        });

        el.querySelector(".cupon__deshacer").addEventListener("click", () => {
            delete canjeados[i];
            guardar();
            el.classList.remove("canjeado");
        });

        grid.appendChild(el);
    });

    // Botón de imprimir solo los cupones
    const btn = document.getElementById("btnImprimirCupones");
    if (btn) {
        btn.addEventListener("click", () => {
            document.body.classList.add("imprimiendo-cupones");
            window.addEventListener("afterprint", () => {
                document.body.classList.remove("imprimiendo-cupones");
            }, { once: true });
            window.print();
        });
    }
}






















/* ===== INICIO ===== */
createPetals();
setupSobre();
setupImprimir();
setupReproductor();
setupRazones();
setupCupones();
setupBeso();