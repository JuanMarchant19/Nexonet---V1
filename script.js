
/* ==========================================
   NEXONET
   CALCULADORA DE SUBNETEO VLSM
========================================== */

// Convierte una dirección IPv4 a número.
function ipANumero(ip) {
    const partes = ip.split(".");

    if (partes.length !== 4) {
        throw new Error("La dirección IP no es válida.");
    }

    let numero = 0;

    for (const parte of partes) {
        if (!/^\d+$/.test(parte)) {
            throw new Error("La dirección IP contiene valores inválidos.");
        }

        const valor = Number(parte);

        if (valor < 0 || valor > 255) {
            throw new Error("Cada octeto debe estar entre 0 y 255.");
        }

        numero = numero * 256 + valor;
    }

    return numero;
}

// Convierte un número a dirección IPv4.
function numeroAIP(numero) {
    return [
        Math.floor(numero / 16777216) % 256,
        Math.floor(numero / 65536) % 256,
        Math.floor(numero / 256) % 256,
        numero % 256
    ].join(".");
}

// Calcula la máscara decimal a partir de un prefijo.
function prefijoAMascara(prefijo) {
    const mascaraNumero = prefijo === 0
        ? 0
        : (0xFFFFFFFF << (32 - prefijo)) >>> 0;

    return numeroAIP(mascaraNumero);
}

/* ==========================================
   CALCULADORA VLSM
========================================== */

function calcularVLSM() {
    const resultado = document.getElementById("resultadoVLSM");

    try {
        const redTexto = document.getElementById("red").value.trim();
        const hostsTexto = document.getElementById("hosts").value.trim();

        // Validar formato IPv4/prefijo.
        const coincidencia = redTexto.match(
            /^(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,2})$/
        );

        if (!coincidencia) {
            throw new Error(
                "Ingresa una red válida en formato IP/prefijo. Ejemplo: 192.168.0.0/22"
            );
        }

        const ipBase = ipANumero(coincidencia[1]);
        const prefijo = Number(coincidencia[2]);

        if (prefijo < 1 || prefijo > 30) {
            throw new Error(
                "Para este ejercicio, utiliza un prefijo entre /1 y /30."
            );
        }

        // Calcular la dirección de red y capacidad principal.
        const bitsRed = 32 - prefijo;
        const totalDirecciones = 2 ** bitsRed;
        const redBase = Math.floor(ipBase / totalDirecciones) * totalDirecciones;

        if (ipBase !== redBase) {
            throw new Error(
                "La dirección ingresada no corresponde al inicio de la red. " +
                "La dirección de red correcta es " +
                numeroAIP(redBase) + "/" + prefijo + "."
            );
        }

        // Leer cantidades separadas por comas, espacios,
        // punto y coma o saltos de línea.
        const valores = hostsTexto
            .split(/[\s,;]+/)
            .filter(Boolean)
            .map(valor => {
                if (!/^\d+$/.test(valor)) {
                    return NaN;
                }
                return Number(valor);
            });

        if (
            valores.length === 0 ||
            valores.some(hosts =>
                !Number.isSafeInteger(hosts) ||
                hosts < 2 ||
                hosts > 1073741822
            )
        ) {
            throw new Error(
                "Ingresa cantidades enteras de al menos 2 hosts. " +
                "Puedes separar los valores con comas o saltos de línea."
            );
        }

        // Ordenar de mayor a menor.
        valores.sort((a, b) => b - a);

        // Calcular el tamaño de bloque requerido para cada subred.
        const subredes = valores.map((hosts, indice) => {
            const bitsHosts = Math.ceil(Math.log2(hosts + 2));
            const direcciones = 2 ** bitsHosts;
            const nuevoPrefijo = 32 - bitsHosts;

            return {
                nombre: "LAN " + (indice + 1),
                hosts,
                direcciones,
                prefijo: nuevoPrefijo
            };
        });

        // Comprobar la capacidad total requerida.
        const direccionesNecesarias = subredes.reduce(
            (total, subred) => total + subred.direcciones,
            0
        );

        if (direccionesNecesarias > totalDirecciones) {
            throw new Error(
                "La red principal no tiene suficiente capacidad. " +
                "Las subredes necesitan " +
                direccionesNecesarias.toLocaleString("es-CL") +
                " direcciones y la red principal dispone de " +
                totalDirecciones.toLocaleString("es-CL") +
                ". Utiliza una red principal más grande, por ejemplo /22 en vez de /24."
            );
        }

        let actual = redBase;
        let filas = "";
        let direccionesAsignadas = 0;

        // Asignar las subredes en orden descendente.
        for (const subred of subredes) {
            const tamano = subred.direcciones;

            // Alinear el inicio al tamaño del bloque.
            const inicio = Math.ceil(actual / tamano) * tamano;
            const fin = inicio + tamano - 1;

            if (fin >= redBase + totalDirecciones) {
                throw new Error(
                    "No existe espacio suficiente para asignar todas las subredes. " +
                    "Prueba con una red principal de mayor capacidad."
                );
            }

            const primera = inicio + 1;
            const ultima = fin - 1;
            const hostsDisponibles = tamano - 2;

            filas += `
                <tr>
                    <td>${subred.nombre}</td>
                    <td>${numeroAIP(inicio)}/${subred.prefijo}</td>
                    <td>${prefijoAMascara(subred.prefijo)}</td>
                    <td>${numeroAIP(primera)}</td>
                    <td>${numeroAIP(ultima)}</td>
                    <td>${numeroAIP(fin)}</td>
                    <td>${subred.hosts}</td>
                    <td>${hostsDisponibles}</td>
                </tr>
            `;

            actual = fin + 1;
            direccionesAsignadas += tamano;
        }

        const direccionesRestantes = totalDirecciones - direccionesAsignadas;

        resultado.innerHTML = `
            <h3>Resultados del subneteo VLSM</h3>

            <table class="tabla">
                <thead>
                    <tr>
                        <th>Subred</th>
                        <th>Dirección de red</th>
                        <th>Máscara</th>
                        <th>Primer host</th>
                        <th>Último host</th>
                        <th>Broadcast</th>
                        <th>Solicitados</th>
                        <th>Disponibles</th>
                    </tr>
                </thead>
                <tbody>
                    ${filas}
                </tbody>
            </table>

            <div class="resumen-vlsm">
                <p><strong>Red principal:</strong> ${numeroAIP(redBase)}/${prefijo}</p>
                <p><strong>Subredes calculadas:</strong> ${subredes.length}</p>
                <p><strong>Direcciones de la red principal:</strong>
                    ${totalDirecciones.toLocaleString("es-CL")}</p>
                <p><strong>Direcciones asignadas:</strong>
                    ${direccionesAsignadas.toLocaleString("es-CL")}</p>
                <p><strong>Direcciones restantes:</strong>
                    ${direccionesRestantes.toLocaleString("es-CL")}</p>
            </div>
        `;

    } catch (error) {
        resultado.innerHTML = `
            <div class="error">${error.message}</div>
        `;
    }
}

/* ==========================================
   NEXONET
   ANÁLISIS MATEMÁTICO DE SEÑAL WI-FI
========================================== */

// Modelo log-distancia:
// L(d) = L0 + 10n log10(d/d0)
function perdidaLogDistancia(d, L0, n, d0) {
    return L0 + 10 * n * Math.log10(d / d0);
}

// Integral de atenuación:
// Ldist = 10n log10(b/a)
function calcularPerdidaAcumulada(a, b, n) {
    return 10 * n * Math.log10(b / a);
}

// Regla de Simpson para aproximar una integral definida.
function simpson(f, a, b, intervalos = 1000) {
    if (intervalos % 2 !== 0) {
        intervalos++;
    }

    const h = (b - a) / intervalos;
    let suma = f(a) + f(b);

    for (let i = 1; i < intervalos; i++) {
        const x = a + i * h;

        if (i % 2 === 0) {
            suma += 2 * f(x);
        } else {
            suma += 4 * f(x);
        }
    }

    return (h / 3) * suma;
}

// Potencia recibida:
// P(x) = P0 - L(x)
function potenciaRecibida(x, P0, L0, n, d0, perdidaMuros) {
    const perdidaDistancia = perdidaLogDistancia(x, L0, n, d0);
    const perdidaTotal = perdidaDistancia + perdidaMuros;

    return P0 - perdidaTotal;
}

// Potencia media en mW:
// Pmedia = 1/(b-a) * Integral de 10^(P(x)/10) dx
function calcularPotenciaMedia(a, b, P0, L0, n, d0, perdidaMuros) {
    const funcionPotencia = function(x) {
        const potenciaDBm = potenciaRecibida(
            x,
            P0,
            L0,
            n,
            d0,
            perdidaMuros
        );

        return Math.pow(10, potenciaDBm / 10);
    };

    const integral = simpson(funcionPotencia, a, b, 1000);
    return integral / (b - a);
}

/* ==========================================
   CALCULADORA WI-FI
========================================== */

function calcularWiFi() {
    const resultado = document.getElementById("resultadoWiFi");

    try {
        const d0 = Number(document.getElementById("distanciaReferencia").value);
        const a = Number(document.getElementById("distanciaInicial").value);
        const b = Number(document.getElementById("distanciaFinal").value);
        const n = Number(document.getElementById("exponente").value);
        const L0 = Number(document.getElementById("perdidaReferencia").value);
        const P0 = Number(document.getElementById("potenciaTransmitida").value);
        const cantidadMuros = Number(document.getElementById("cantidadMuros").value);
        const perdidaMuro = Number(document.getElementById("perdidaMuro").value);

        const valores = [d0, a, b, n, L0, P0, cantidadMuros, perdidaMuro];

        if (!valores.every(Number.isFinite)) {
            throw new Error("Todos los campos deben contener valores numéricos.");
        }

        if (
            d0 <= 0 ||
            a <= 0 ||
            b <= a ||
            n <= 0 ||
            L0 < 0 ||
            cantidadMuros < 0 ||
            !Number.isInteger(cantidadMuros) ||
            perdidaMuro < 0
        ) {
            throw new Error(
                "Revisa los datos: d₀ y a deben ser positivos, b debe ser mayor que a, " +
                "n debe ser positivo y las pérdidas no pueden ser negativas."
            );
        }

        // 1. Pérdida acumulada por distancia.
        const perdidaDistancia = calcularPerdidaAcumulada(a, b, n);

        // 2. Pérdida por obstáculos.
        const perdidaMuros = cantidadMuros * perdidaMuro;

        // 3. Pérdida inicial y pérdida total al final.
        const perdidaInicial = perdidaLogDistancia(a, L0, n, d0);
        const perdidaTotal = perdidaInicial + perdidaDistancia + perdidaMuros;

        // 4. Potencia recibida al final.
        const potenciaFinal = P0 - perdidaTotal;

        // 5. Potencia media en mW.
        const potenciaMediaMW = calcularPotenciaMedia(
            a,
            b,
            P0,
            L0,
            n,
            d0,
            perdidaMuros
        );

        if (!Number.isFinite(potenciaMediaMW) || potenciaMediaMW <= 0) {
            throw new Error("No fue posible calcular la potencia media con esos valores.");
        }

        // 6. Convertir potencia media a dBm.
        const potenciaMediaDBm = 10 * Math.log10(potenciaMediaMW);

        // 7. Potencia recibida al inicio.
        const potenciaInicial = potenciaRecibida(
            a,
            P0,
            L0,
            n,
            d0,
            perdidaMuros
        );

        // Mostrar resultados.
        resultado.innerHTML = `
            <h3>Resultados del análisis Wi-Fi</h3>

            <table class="tabla">
                <thead>
                    <tr>
                        <th>Parámetro</th>
                        <th>Resultado</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Pérdida acumulada por distancia</td>
                        <td>${perdidaDistancia.toFixed(3)} dB</td>
                    </tr>
                    <tr>
                        <td>Pérdida inicial desde referencia hasta a</td>
                        <td>${perdidaInicial.toFixed(3)} dB</td>
                    </tr>
                    <tr>
                        <td>Pérdida por muros</td>
                        <td>${perdidaMuros.toFixed(3)} dB</td>
                    </tr>
                    <tr>
                        <td><strong>Pérdida total al final</strong></td>
                        <td><strong>${perdidaTotal.toFixed(3)} dB</strong></td>
                    </tr>
                    <tr>
                        <td>Potencia recibida al inicio</td>
                        <td>${potenciaInicial.toFixed(3)} dBm</td>
                    </tr>
                    <tr>
                        <td><strong>Potencia recibida al final</strong></td>
                        <td><strong>${potenciaFinal.toFixed(3)} dBm</strong></td>
                    </tr>
                    <tr>
                        <td>Potencia media recibida</td>
                        <td>${potenciaMediaMW.toFixed(8)} mW</td>
                    </tr>
                    <tr>
                        <td><strong>Potencia media en dBm</strong></td>
                        <td><strong>${potenciaMediaDBm.toFixed(3)} dBm</strong></td>
                    </tr>
                </tbody>
            </table>

            <h3 style="margin-top: 25px;">Desarrollo matemático</h3>

            <p>
                <strong>Modelo log-distancia:</strong>
                L(d) = L₀ + 10n log₁₀(d/d₀)
            </p>

            <p>
                <strong>Integral de atenuación:</strong>
                10(${n}) log₁₀(${b}/${a})
                = ${perdidaDistancia.toFixed(3)} dB
            </p>

            <p>
                <strong>Pérdida por muros:</strong>
                ${cantidadMuros} × ${perdidaMuro}
                = ${perdidaMuros.toFixed(3)} dB
            </p>

            <p>
                <strong>Potencia recibida:</strong>
                ${P0} − ${perdidaTotal.toFixed(3)}
                = ${potenciaFinal.toFixed(3)} dBm
            </p>

            <p>
                <strong>Potencia media:</strong>
                ${potenciaMediaMW.toFixed(8)} mW
                = ${potenciaMediaDBm.toFixed(3)} dBm
            </p>

            <small>
                La potencia media se obtiene aproximando la integral
                mediante la regla de Simpson.
            </small>
        `;

        // Actualizar gráfico.
        crearGraficoWiFi(a, b, P0, L0, n, d0, perdidaMuros);

    } catch (error) {
        resultado.innerHTML = `
            <div class="error">${error.message}</div>
        `;
    }
}

/* ==========================================
   GRÁFICO DE POTENCIA RECIBIDA
========================================== */

let graficoWiFi = null;

function crearGraficoWiFi(a, b, P0, L0, n, d0, perdidaMuros) {
    const canvas = document.getElementById("graficoWiFi");

    if (!canvas || typeof Chart === "undefined") {
        return;
    }

    const distancias = [];
    const potencias = [];
    const cantidadPuntos = 50;

    for (let i = 0; i <= cantidadPuntos; i++) {
        const x = a + (b - a) * i / cantidadPuntos;

        const potencia = potenciaRecibida(
            x,
            P0,
            L0,
            n,
            d0,
            perdidaMuros
        );

        distancias.push(Number(x.toFixed(2)));
        potencias.push(Number(potencia.toFixed(3)));
    }

    if (graficoWiFi) {
        graficoWiFi.destroy();
    }

    graficoWiFi = new Chart(canvas, {
        type: "line",
        data: {
            labels: distancias,
            datasets: [{
                label: "Potencia recibida (dBm)",
                data: potencias,
                borderWidth: 2,
                tension: 0.25,
                fill: false
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: "Distancia (metros)"
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: "Potencia recibida (dBm)"
                    }
                }
            }
        }
    });
}

