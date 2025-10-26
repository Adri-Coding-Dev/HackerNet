const machines = [
    { name: "Injection", 
        platform: "DockerLabs", 
        os: "Linux", 
        link: "https://mega.nz/file/rZlAERjY#152uP-zS7pTC0hbPaZB7aO6_puij633u4pW-jpMuctk" 
    },
    { name: "ICA_1", 
        platform: "VulnHub", 
        os: "Linux", 
        link: "https://www.vulnhub.com/entry/ica-1,748" 
    },
];

function displayMachines(list) {
    const container = document.getElementById("machineContainer");
    container.innerHTML = "";
    list.forEach(machine => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <h3>${machine.name}</h3>
            <p><strong>Plataforma:</strong> ${machine.platform}</p>
            <p><strong>SO:</strong> ${machine.os}</p>
            <p><a href="${machine.link}" target="_blank">Enlace de descarga / acceso</a></p>
        `;
        container.appendChild(card);
    });
}

function filterMachines() {
    const name = document.getElementById("searchName").value.toLowerCase();
    const platform = document.getElementById("filterPlatform").value;
    const os = document.getElementById("filterOS").value;

    const filtered = machines.filter(m => 
        m.name.toLowerCase().includes(name) &&
        (platform === "" || m.platform === platform) &&
        (os === "" || m.os === os)
    );

    displayMachines(filtered);
}

// Inicializar
displayMachines(machines);