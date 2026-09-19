let dismissalQueue =
    JSON.parse(
        localStorage.getItem("dismissalQueue")
    ) || [];

let START_SPOT =
    parseInt(
        localStorage.getItem("startSpot")
    ) || 3;

let END_SPOT =
    parseInt(
        localStorage.getItem("endSpot")
    ) || 10;

let CARS_DISPLAYED =
    parseInt(
        localStorage.getItem("carsDisplayed")
    ) || 24;

let dismissalStartTime =
    localStorage.getItem(
        "dismissalStartTime"
    );    

renderQueue();

function saveQueue() {

    localStorage.setItem(
        "dismissalQueue",
        JSON.stringify(dismissalQueue)
    );

}

function renderQueue() {

    let recentEntries =
        document.getElementById("recentEntries");

    if (!recentEntries) {
        return;
    }

    recentEntries.innerHTML = "";

    for (let i = dismissalQueue.length - 1; i >= 0; i--) {

        recentEntries.innerHTML += `
            <div class="queue-item">

                <span>

                    ${
    dismissalQueue[i].editedFrom

    ? `${dismissalQueue[i].editedFrom}
       →
       <span class="edited-new">
            ${dismissalQueue[i].tag}
       </span>`

    : dismissalQueue[i].tag
}

                </span>

                <div class="queue-actions">

<button onclick="editVehicle(${i})">
    <i class="fa-solid fa-pen"></i>
</button>

<button onclick="deleteVehicle(${i})">
    <i class="fa-solid fa-trash"></i>
</button>

                </div>

            </div>
        `;
    }
}

function addVehicle() {

    let tagInput =
        document.getElementById("tagInput");

    let tagNumber =
        tagInput.value.trim();

    if (tagNumber === "") {
        return;
    }

    if (
        dismissalQueue.some(
            item => item.tag === tagNumber
        )
    ) {

        let proceed = confirm(
            tagNumber +
            " is already in the queue.\n\n" +
            "Do you want to add it again?"
        );

        if (!proceed) {
            tagInput.focus();
            return;
        }
    }

    const spotCount =
       END_SPOT - START_SPOT + 1;

    const assignedSpot =
       START_SPOT +
       (dismissalQueue.length % spotCount);

    dismissalQueue.push({
        tag: tagNumber,
        spot: assignedSpot,
        released: false,
        needsStudent: false
    });

    saveQueue();

    renderQueue();

    tagInput.value = "";

    tagInput.focus();
}

function deleteVehicle(index) {

    let proceed = confirm(
        "Remove tag " +
        dismissalQueue[index].tag +
        "?"
    );

    if (!proceed) {
        return;
    }

    dismissalQueue.splice(index, 1);

    saveQueue();

    renderQueue();
}

function editVehicle(index) {

    let oldTag =
        dismissalQueue[index].tag;

    let newTag = prompt(
        "Edit Tag Number",
        oldTag
    );

    if (
        newTag === null ||
        newTag.trim() === ""
    ) {
        return;
    }

    dismissalQueue[index].tag =
        newTag.trim();

    dismissalQueue[index].editedFrom =
        oldTag;

    saveQueue();

    renderQueue();
}

function toggleRelease(tag) {

    tag.classList.toggle("released");

}

function renderDismissalBoard() {

    let board =
        document.getElementById("dismissalBoard");

    if (!board) {
        return;
    }

    board.innerHTML = "";

    let activeStudents =
        dismissalQueue
            .filter(
                student => !student.released
            );

    activeStudents.sort(function (a, b) {

        if (
            a.needsStudent &&
            !b.needsStudent
        ) {
            return -1;
        }

        if (
            !a.needsStudent &&
            b.needsStudent
        ) {
            return 1;
        }

        return 0;

    });

    activeStudents =
        activeStudents.slice(
            0,
            CARS_DISPLAYED
        );

let columns;

if (CARS_DISPLAYED <= 12) {

    columns = 4;

} else if (CARS_DISPLAYED <= 24) {

    columns = 5;

} else if (CARS_DISPLAYED <= 32) {

    columns = 6;

} else {

    columns = Math.ceil(
        Math.sqrt(
            CARS_DISPLAYED
        )
    );
}

    board.style.gridTemplateColumns =
        `repeat(${columns}, 1fr)`;

    for (
        let i = 0;
        i < CARS_DISPLAYED;
        i++
    ) {

        if (activeStudents[i]) {

            let tagDisplay =
                activeStudents[i].needsStudent
                    ? `⚠ ${activeStudents[i].tag}`
                    : activeStudents[i].tag;

            let alertClass =
                activeStudents[i].needsStudent
                    ? "board-alert"
                    : "";

            board.innerHTML += `
                <div class="
                    board-tile
                    ${alertClass}
                ">
                    ${tagDisplay}
                </div>
            `;

        } else {

            board.innerHTML += `
                <div class="
                    board-tile
                    board-empty
                ">
                </div>
            `;
        }
    }
}

function renderReleaseBoard() {

    let board =
        document.getElementById("releaseBoard");

    if (!board) {
        return;
    }

    board.innerHTML = "";

    let maxColumns = 25;

    for (
        let spot = START_SPOT;
        spot <= END_SPOT;
        spot++
    ) {

        let studentsForSpot =
            dismissalQueue.filter(
                student => student.spot === spot
            );

        if (
            studentsForSpot.length >
            maxColumns
        ) {
            maxColumns =
                studentsForSpot.length;
        }
    }

    let spotWidth =
        window.innerWidth <= 600
            ? 50
            : 70;

    board.style.gridTemplateColumns =
        `${spotWidth}px repeat(${maxColumns}, 140px)`;

    for (
        let spot = START_SPOT;
        spot <= END_SPOT;
        spot++
    ) {

        board.innerHTML += `
            <div class="spot-cell">
                ${spot}
            </div>
        `;

        let spotStudents =
            dismissalQueue.filter(
                student => student.spot === spot
            );

        for (
            let col = 0;
            col < maxColumns;
            col++
        ) {

            if (spotStudents[col]) {

                let statusClass = "";

                if (spotStudents[col].released) {

                    statusClass = "released";

                }
                else if (
                    spotStudents[col].needsStudent
                ) {

                    statusClass =
                        "needs-student";
                }

                board.innerHTML += `
                    <div
                        class="release-cell ${statusClass}"
                        onclick="releaseStudent('${spotStudents[col].tag}')">

                        ${spotStudents[col].needsStudent ? "⚠ " : ""}
                        ${spotStudents[col].tag}

                    </div>
                `;

            } else {

                board.innerHTML += `
                    <div class="release-cell empty-cell"></div>
                `;
            }
        }
    }
}

function releaseStudent(tagNumber) {

    let student =
        dismissalQueue.find(
            item => item.tag === tagNumber
        );

    if (!student) {
        return;
    }

if (!dismissalStartTime) {

    dismissalStartTime =
        new Date().toISOString();

    localStorage.setItem(
        "dismissalStartTime",
        dismissalStartTime
    );
}

student.released = true;

student.needsStudent = false;

    saveQueue();

    renderReleaseBoard();

    renderSpotManager();

    renderDismissalBoard();
}

function loadSettings() {

    let schoolBox =
        document.getElementById("schoolName");

    let startBox =
        document.getElementById("startSpot");

    let endBox =
        document.getElementById("endSpot");

    let carsBox =
        document.getElementById("carsDisplayed");

    if (
        !schoolBox ||
        !startBox ||
        !endBox ||
        !carsBox
    ) {
        return;
    }

    schoolBox.value =
        localStorage.getItem("schoolName")
        || "School";

    startBox.value = START_SPOT;

    endBox.value = END_SPOT;

    carsBox.value =
        localStorage.getItem("carsDisplayed")
        || 24;
}

function saveSettings() {

    let schoolBox =
        document.getElementById("schoolName");

    let startBox =
        document.getElementById("startSpot");

    let endBox =
        document.getElementById("endSpot");

    let carsBox =
        document.getElementById("carsDisplayed");

    let startValue =
        parseInt(startBox.value);

    let endValue =
        parseInt(endBox.value);

    let carsValue =
        parseInt(carsBox.value);

    if (
        isNaN(startValue) ||
        isNaN(endValue) ||
        isNaN(carsValue)
    ) {

        alert(
            "Please enter valid values."
        );

        return;
    }

    localStorage.setItem(
        "schoolName",
        schoolBox.value
    );

    localStorage.setItem(
        "startSpot",
        startValue
    );

    localStorage.setItem(
        "endSpot",
        endValue
    );

    localStorage.setItem(
        "carsDisplayed",
        carsValue
    );

    alert(
        "Settings saved."
    );
}

function renderSpotManager() {

    let board =
        document.getElementById("spotManagerBoard");

    if (!board) {
        return;
    }

    board.innerHTML = "";

    let maxColumns = 25;

    for (
        let spot = START_SPOT;
        spot <= END_SPOT;
        spot++
    ) {

        let studentsForSpot =
            dismissalQueue.filter(
                student => student.spot === spot
            );

        if (
            studentsForSpot.length >
            maxColumns
        ) {
            maxColumns =
                studentsForSpot.length;
        }
    }

    let spotWidth =
    window.innerWidth <= 600
        ? 50
        : 70;

board.style.gridTemplateColumns =
    `${spotWidth}px repeat(${maxColumns}, 140px)`;

    for (
        let spot = START_SPOT;
        spot <= END_SPOT;
        spot++
    ) {

        board.innerHTML += `
            <div class="spot-cell">
                ${spot}
            </div>
        `;

        let spotStudents =
            dismissalQueue.filter(
                student => student.spot === spot
            );

        for (
            let col = 0;
            col < maxColumns;
            col++
        ) {

            if (spotStudents[col]) {

                let statusClass = "";

                if (spotStudents[col].released) {

                    statusClass = "released";

                } else if (
                    spotStudents[col].needsStudent
                ) {

                    statusClass = "needs-student";
                }

                board.innerHTML += `
                    <div
                        class="release-cell ${statusClass}"
                        onclick="requestStudent('${spotStudents[col].tag}')">

                        ${spotStudents[col].needsStudent ? "⚠ " : ""}

                        ${spotStudents[col].tag}

                    </div>
                `;

            } else {

                board.innerHTML += `
                    <div class="release-cell empty-cell"></div>
                `;
            }
        }
    }
}

function requestStudent(tagNumber) {

    let student =
        dismissalQueue.find(
            item => item.tag === tagNumber
        );

    if (!student) {
        return;
    }

    if (student.released) {

        alert(
            "Student already released."
        );

        return;
    }

    let confirmed = confirm(
        "Send student needed alert for tag " +
        tagNumber +
        "?"
    );

    if (!confirmed) {
        return;
    }

    student.needsStudent = true;

    saveQueue();

    renderSpotManager();
}

function endDismissal() {

    if (!dismissalStartTime) {

        alert(
            "Dismissal has not started yet."
        );

        return;
    }

    let confirmed = confirm(
        "End today's dismissal?"
    );

    if (!confirmed) {
        return;
    }

    let releasedCount =
        dismissalQueue.filter(
            student => student.released
        ).length;

    let startTime =
        new Date(
            dismissalStartTime
        );

    let endTime =
        new Date();

    let durationMinutes =
        (
            endTime - startTime
        ) / 60000;

    let history =
        JSON.parse(
            localStorage.getItem(
                "dismissalHistory"
            )
        ) || [];

    history.unshift({

    date:
        endTime.toLocaleDateString(),

    startTime:
        startTime.toLocaleTimeString(),

    endTime:
        endTime.toLocaleTimeString(),

    carsReleased:
        releasedCount,

    duration:
        durationMinutes,

    carsPerMinute:
        (
            releasedCount /
            Math.max(
                durationMinutes,
                1
            )
        ).toFixed(1)
});

    localStorage.setItem(
        "dismissalHistory",
        JSON.stringify(history)
    );

    dismissalQueue = [];

    saveQueue();

    localStorage.removeItem(
        "dismissalStartTime"
    );

    dismissalStartTime = null;

    alert(
        "Dismissal ended and saved to history."
    );

    location.reload();
}

function renderLastDismissal() {

    let stats =
        document.getElementById(
            "lastDismissalStats"
        );

    if (!stats) {
        return;
    }

    let history =
        JSON.parse(
            localStorage.getItem(
                "dismissalHistory"
            )
        ) || [];

    if (history.length === 0) {

        stats.innerHTML =
            "<p>No dismissal history yet.</p>";

        return;
    }

    let last =
        history[0];

    stats.innerHTML = `

        <p>
            🚗 Cars Released:
            ${last.carsReleased}
        </p>

        <p>
            🕒 Start:
            ${last.startTime || "N/A"}
        </p>

        <p>
            🕒 End:
            ${last.endTime || "N/A"}
        </p>

        <p>
            ⏱ Duration:
            ${formatDuration(last.duration)}
        </p>

        <p>
            📈 Cars/Minute:
            ${last.carsPerMinute}
        </p>

    `;
}

function formatDuration(minutes) {

    let totalSeconds =
        Math.round(minutes * 60);

    let hours =
        Math.floor(totalSeconds / 3600);

    let mins =
        Math.floor(
            (totalSeconds % 3600) / 60
        );

    let seconds =
        totalSeconds % 60;

    if (hours > 0) {

        return `${hours}h ${mins}m ${seconds}s`;

    }

    return `${mins}m ${seconds}s`;
}

function renderHistory() {

    let historyList =
        document.getElementById(
            "historyList"
        );

    if (!historyList) {
        return;
    }

    let history =
        JSON.parse(
            localStorage.getItem(
                "dismissalHistory"
            )
        ) || [];

    historyList.innerHTML = "";

    if (history.length === 0) {

        historyList.innerHTML = `
            <div class="history-card">
                No dismissal history yet.
            </div>
        `;

        return;
    }

    for (
        let i = 0;
        i < history.length;
        i++
    ) {

        historyList.innerHTML += `

            <div class="history-card">

                <div class="history-header">

                    <h2>
                        ${history[i].date}
                    </h2>

                    <button
                        class="delete-history"
                        onclick="deleteHistory(${i})">

                        <i class="fa-solid fa-trash"></i>

                    </button>

                </div>

                <p>
                    Cars Released:
                    ${history[i].carsReleased}
                </p>

                <p>
                    Start Time:
                    ${history[i].startTime}
                </p>

                <p>
                    End Time:
                    ${history[i].endTime}
                </p>

                <p>
                    Duration:
                    ${formatDuration(
                        history[i].duration
                    )}
                </p>

                <p>
                    Cars Per Minute:
                    ${history[i].carsPerMinute}
                </p>

            </div>

        `;
    }
}

function deleteHistory(index) {

    let confirmDelete = confirm(
        "Delete this dismissal record?"
    );

    if (!confirmDelete) {
        return;
    }

    let history =
        JSON.parse(
            localStorage.getItem(
                "dismissalHistory"
            )
        ) || [];

    history.splice(index, 1);

    localStorage.setItem(
        "dismissalHistory",
        JSON.stringify(history)
    );

    renderHistory();
}

function renderSchoolName() {

    let title =
        document.getElementById(
            "schoolTitle"
        );

    if (!title) {
        return;
    }

    let schoolName =
        localStorage.getItem(
            "schoolName"
        ) || "School";

    title.innerText =
        schoolName;
}

function renderCurrentDismissal() {

    let stats =
        document.getElementById(
            "currentDismissalStats"
        );

    if (!stats) {
        return;
    }

    let waitingCount =
        dismissalQueue.filter(
            student =>
                !student.released
        ).length;

    let releasedCount =
        dismissalQueue.filter(
            student =>
                student.released
        ).length;

    let alertCount =
        dismissalQueue.filter(
            student =>
                student.needsStudent
        ).length;

    if (
        waitingCount === 0 &&
        releasedCount === 0
    ) {

        stats.innerHTML =
            "<p>No active dismissal.</p>";

        return;
    }

     let elapsedText =
        getElapsedTime();

         stats.innerHTML = `

        <div class="current-stats">

            <p>
                Waiting:
                ${waitingCount}
            </p>

            <p>
                Released:
                ${releasedCount}
            </p>

            <p>
                Alerts:
                ${alertCount}
            </p>

            <p>
                Elapsed:
                ${elapsedText}
            </p>

        </div>

    `;
}

function getElapsedTime() {

    if (!dismissalStartTime) {
        return "Not Started";
    }

    let start =
        new Date(dismissalStartTime);

    let now =
        new Date();

    let seconds =
        Math.floor(
            (now - start) / 1000
        );

    let hours =
        Math.floor(seconds / 3600);

    let minutes =
        Math.floor(
            (seconds % 3600) / 60
        );

    let remainingSeconds =
        seconds % 60;

    if (hours > 0) {

        return `${hours}h ${minutes}m ${remainingSeconds}s`;

    }

    return `${minutes}m ${remainingSeconds}s`;
}