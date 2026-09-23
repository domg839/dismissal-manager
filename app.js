let dismissalQueue = [];

let endingDismissal = false;
let dismissalEnding = false;

let totalAlerts = 0;
let totalRequestSeconds = 0;
let completedRequests = 0;
let START_SPOT = 3;
let END_SPOT = 10;
let CARS_DISPLAYED = 25;
let dismissalStartTime = null;
let SCHOOL_NAME = "School";
let rainyDay = false;
let showSpotsOnBoard = false;
let boardReleaseEnabled = false;

async function loadSettingsFromFirebase() {

    const settings =
        await window.loadSettingsFromFirestore();

    if (!settings) {
        return;
    }

    SCHOOL_NAME =
        settings.schoolName || "School";

    START_SPOT =
        settings.startSpot || 3;

    END_SPOT =
        settings.endSpot || 10;

    CARS_DISPLAYED =
        settings.carsDisplayed || 25;

    dismissalStartTime =
        settings.dismissalStartTime || null;

    dismissalEnding =
        settings.dismissalEnding || false;    

    showSpotsOnBoard =
        settings.showSpotsOnBoard || false;

    boardReleaseEnabled =
        settings.boardReleaseEnabled || false;    

    rainyDay =
        settings.rainyDay || false;    

    console.log(
        "Settings Loaded:",
        settings
    );

    return settings;
}

renderQueue();

function renderQueue() {

    let recentEntries =
        document.getElementById("recentEntries");

    if (!recentEntries) {
        return;
    }

    recentEntries.innerHTML = "";

    if (
        dismissalQueue.length === 0
    ) {

        recentEntries.innerHTML = `
            <div class="empty-queue">
                No recent entries yet.
            </div>
        `;

        return;
    }

    let tagCounts = {};

    dismissalQueue.forEach(student => {

        let tags =
            student.tag.split(" ");

        tags.forEach(tag => {

            tagCounts[tag] =
                (tagCounts[tag] || 0) + 1;

        });

    });

    for (
        let i = dismissalQueue.length - 1;
        i >= 0;
        i--
    ) {

        let student =
            dismissalQueue[i];

        let tagDisplay = "";

        if (
            student.editedFrom
        ) {

            let isDuplicate =
    dismissalQueue.some(
        item =>
            item.id !== student.id &&
            item.tag
                .split(" ")
                .includes(student.tag)
    );

let editedClass =
    isDuplicate
        ? "duplicate-tag edited-new"
        : "queue-tag edited-new";

            if (
                student.released
            ) {

                editedClass +=
                    " released-tag";

            }
            else if (
                student.needsStudent
            ) {

                editedClass +=
                    " alert-tag";

            }

            if (
                student.pending
            ) {

                editedClass +=
                    " pending-tag";

            }

            tagDisplay = `
                <span class="queue-tag">
                    ${student.editedFrom}
                </span>

                →

                <span class="${editedClass}">
                    ${student.tag}
                </span>
            `;

        }
        else {

            let tags =
                student.tag.split(" ");

            tagDisplay =
                tags.map(tag => {

                    let cssClass =
                        student.pending
                            ? "queue-tag pending-tag"
                            : "queue-tag";

                    if (
                        student.released
                    ) {

                        cssClass =
                            student.pending
                                ? "queue-tag released-tag pending-tag"
                                : "queue-tag released-tag";

                    }
                    else if (
                        student.needsStudent
                    ) {

                        cssClass =
                            student.pending
                                ? "queue-tag alert-tag pending-tag"
                                : "queue-tag alert-tag";

                    }
                    else if (
                        tagCounts[tag] > 1
                    ) {

                        cssClass =
                            student.pending
                                ? "duplicate-tag pending-tag"
                                : "duplicate-tag";

                    }

                    return `
                        <span class="${cssClass}">
                            ${tag}
                        </span>
                    `;

                }).join("");

        }

        recentEntries.innerHTML += `
            <div class="queue-item">

                <span>

                    <span class="queue-position">
                        ${student.queuePosition}.
                    </span>

                    <span class="queue-status ${
                        student.pending
                            ? "status-saving"
                            : "status-saved"
                    }">

                        <i class="fa-solid ${
                            student.pending
                                ? "fa-arrows-rotate"
                                : "fa-check"
                        }"></i>

                    </span>

                    ${tagDisplay}

                </span>

                <div class="queue-actions">

                    <button
                        ${student.pending ? "disabled" : ""}
                        onclick="editVehicle(${i})">

                        <i class="fa-solid fa-pen"></i>

                    </button>

                    <button
                        ${student.pending ? "disabled" : ""}
                        onclick="deleteVehicle(${i})">

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

    const nextQueuePosition =
        Math.max(
            ...dismissalQueue.map(
                item => item.queuePosition || 0
            ),
            0
        ) + 1;

    const studentRecord = {
        tag: tagNumber,
        queuePosition: nextQueuePosition,
        spot: assignedSpot,
        released: false,
        needsStudent: false,
        syncStatus: "saving"
    };

    addVehicleToFirebase(
        studentRecord
    );

    renderQueue();

    let recentCard =
        document.querySelector(
            ".recent-card"
        );

    if (recentCard) {

        recentCard.scrollTop = 0;

    }

    tagInput.value = "";

    tagInput.focus();
}

async function deleteVehicleFirebase(student) {

    try {

        const docRef =
            window.firebaseServices.doc(
                window.firebaseServices.db,
                "dismissalQueue",
                student.id
            );

        await window.firebaseServices.deleteDoc(
            docRef
        );

        console.log(
            "Student deleted"
        );

    } catch (error) {

        console.error(error);

    }
}

async function deleteVehicle(index) {

    let student =
        dismissalQueue[index];

    let proceed;

    if (student.released) {

        proceed = confirm(
            "Tag " +
            student.tag +
            " has already been released.\n\n" +
            "Released tags should normally remain in the queue.\n\n" +
            "Delete anyway?"
        );

    } else {

        proceed = confirm(
            "Remove tag " +
            student.tag +
            "?"
        );

    }

    if (!proceed) {
        return;
    }

    await deleteVehicleFirebase(
        student
    );

}

async function editVehicle(index) {

    let student =
        dismissalQueue[index];

    let oldTag =
        student.tag;

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

    newTag =
        newTag.trim();

    if (
        dismissalQueue.some(
            item =>
                item.tag === newTag &&
                item.id !== student.id
        )
    ) {

        let proceed = confirm(
            newTag +
            " is already in the queue.\n\n" +
            "Do you want to use it anyway?"
        );

        if (!proceed) {
            return;
        }

    }

    await editVehicleFirebase(
        student,
        newTag,
        oldTag
    );

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
        dismissalQueue.filter(
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

let columns =
    Math.ceil(
        Math.sqrt(
            CARS_DISPLAYED
        )
    );

let rows =
    Math.ceil(
        CARS_DISPLAYED /
        columns
    );

    board.style.gridTemplateColumns =
        `repeat(${columns}, 1fr)`;

    board.style.gridTemplateRows =
        `repeat(${rows}, 1fr)`;    

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

if (showSpotsOnBoard) {

    tagDisplay = `
        ${activeStudents[i].needsStudent ? "⚠ " : ""}
        ${activeStudents[i].tag}

<span class="board-spot">
    #${
        START_SPOT +
        (i % (
            END_SPOT -
            START_SPOT +
            1
        ))
    }
</span>
    `;

}

let alertClass =
    activeStudents[i].needsStudent
        ? "board-alert"
        : "";

let fontClass =
    "board-large";

let displayLength =
    activeStudents[i].tag.length;

if (displayLength > 9) {
    fontClass = "board-medium";
}

if (displayLength > 14) {
    fontClass = "board-small";
}

board.innerHTML += `
    <div class="
        board-tile
        ${alertClass}
        ${fontClass}
    "

    ${
        boardReleaseEnabled
            ? `onclick="releaseStudentFromBoard('${activeStudents[i].id}')"`
            : ""
    }

    >

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
            ? 70
            : 90;

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

let activeStudents =
    [...dismissalQueue]
        .sort(
            (a, b) =>
                a.queuePosition -
                b.queuePosition
        );

let spotStudents =
    activeStudents.filter(
        (student, index) =>
            START_SPOT +
            (index % (
                END_SPOT -
                START_SPOT +
                1
            )) === spot
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
        onclick="releaseStudent('${spotStudents[col].id}')">

        ${spotStudents[col].needsStudent ? "⚠ " : ""}
        ${spotStudents[col].tag}

        ${spotStudents[col].needsStudent &&
          spotStudents[col].requestedAt
            ? `<div class="spot-alert-age">
                ${getAlertAge(
                    spotStudents[col]
                )}
               </div>`
            : ""}

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

function releaseStudent(studentId) {

let student =
    dismissalQueue.find(
        item => item.id === studentId
    );

    if (!student) {
        return;
    }

if (!dismissalStartTime) {

    dismissalStartTime =
        new Date().toISOString();

    updateDismissalStartTime(
        dismissalStartTime
    );

}

    releaseStudentFirebase(
        student
    );

}

async function loadSettings() {

    let schoolBox =
        document.getElementById("schoolName");

    let startBox =
        document.getElementById("startSpot");

    let endBox =
        document.getElementById("endSpot");

    let carsBox =
        document.getElementById("carsDisplayed");

    let spotsBoardBox =
        document.getElementById(
            "showSpotsOnBoard"
        );

    let boardReleaseBox =
        document.getElementById(
            "boardReleaseEnabled"
        );

    if (
        !schoolBox ||
        !startBox ||
        !endBox ||
        !carsBox ||
        !spotsBoardBox ||
        !boardReleaseBox
    ) {
        return;
    }

    const settings =
        await window.loadSettingsFromFirestore();

    if (!settings) {
        return;
    }

    schoolBox.value =
        settings.schoolName || "";

    startBox.value =
        settings.startSpot || 3;

    endBox.value =
        settings.endSpot || 10;

    carsBox.value =
        settings.carsDisplayed || 25;

    spotsBoardBox.checked =
        settings.showSpotsOnBoard || false;

    boardReleaseBox.checked =
        settings.boardReleaseEnabled || false;

}

async function saveSettings() {

    let schoolBox =
        document.getElementById("schoolName");

    let startBox =
        document.getElementById("startSpot");

    let endBox =
        document.getElementById("endSpot");

    let carsBox =
        document.getElementById("carsDisplayed");

    let spotsBoardBox =
        document.getElementById(
            "showSpotsOnBoard"
        );

    let boardReleaseBox =
        document.getElementById(
            "boardReleaseEnabled"
        );

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

    await saveSettingsToFirebase({

        schoolName:
            schoolBox.value,

        startSpot:
            startValue,

        endSpot:
            endValue,

        carsDisplayed:
            carsValue,

        showSpotsOnBoard:
            spotsBoardBox.checked,

        boardReleaseEnabled:
            boardReleaseBox.checked

    });

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
        ? 70
        : 90;

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

let activeStudents =
    [...dismissalQueue]
        .sort(
            (a, b) =>
                a.queuePosition -
                b.queuePosition
        );

let spotStudents =
    activeStudents.filter(
        (student, index) =>
            START_SPOT +
            (index % (
                END_SPOT -
                START_SPOT +
                1
            )) === spot
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
        onclick="requestStudent('${spotStudents[col].id}')">

        ${spotStudents[col].needsStudent ? "⚠ " : ""}
        ${spotStudents[col].tag}

        ${spotStudents[col].needsStudent &&
          spotStudents[col].requestedAt
            ? `<div class="spot-alert-age">
${getAlertAge(
    spotStudents[col]
)}
               </div>`
            : ""}

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

async function requestStudent(studentId) {

    let student =
        dismissalQueue.find(
            item => item.id === studentId
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

    let message =
        student.needsStudent
            ? "Remove student needed alert for tag " +
              student.tag +
              "?"
            : "Send student needed alert for tag " +
              student.tag +
              "?";

    let confirmed =
        confirm(message);

    if (!confirmed) {
        return;
    }

    try {

        const docRef =
            window.firebaseServices.doc(
                window.firebaseServices.db,
                "dismissalQueue",
                student.id
            );

        if (!student.needsStudent) {

            const settingsRef =
                window.firebaseServices.doc(
                    window.firebaseServices.db,
                    "settings",
                    "config"
                );

            const settings =
                await window.loadSettingsFromFirestore();

            await window.firebaseServices.updateDoc(
                settingsRef,
                {
                    totalAlerts:
                        (settings.totalAlerts || 0) + 1
                }
            );

        }

        await window.firebaseServices.updateDoc(
            docRef,
            {
                needsStudent:
                    !student.needsStudent,

                requestedAt:
                    !student.needsStudent
                        ? Date.now()
                        : null
            }
        );

        console.log(
            "Student alert updated"
        );

    } catch (error) {

        console.error(error);

    }

}

async function endDismissal() {

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

endingDismissal = true;

dismissalEnding = true;

const settingsRef =
    window.firebaseServices.doc(
        window.firebaseServices.db,
        "settings",
        "config"
    );

await window.firebaseServices.updateDoc(
    settingsRef,
    {
        dismissalEnding: true
    }
);

let endButton =
    document.querySelector(
        ".btn-end-admin"
    );

if (endButton) {

    endButton.disabled = true;

endButton.innerHTML = `
    <i class="fa-solid fa-arrows-rotate"></i>
    <div>Ending</div>
`;

}

renderCurrentDismissal();

    const currentQueue =
        await getCurrentQueueFromFirestore();

let releasedCount =
    currentQueue.length;

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

const currentSettings =
    await window.loadSettingsFromFirestore();

const historyRecord = {

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
        ).toFixed(1),

    rainyDay:
        rainyDay,

totalAlerts:
    currentSettings.totalAlerts || 0,

averageRequestTime:
    (currentSettings.completedRequests || 0) > 0
        ? Math.round(
            (currentSettings.totalRequestSeconds || 0) /
            currentSettings.completedRequests
          )
        : null

};

    await saveHistoryToFirebase(
        historyRecord
    );

    await clearFirebaseQueue();

    dismissalQueue = [];

    await updateDismissalStartTime(
        null
    );

await window.firebaseServices.updateDoc(
    settingsRef,
    {
        rainyDay: false,

        dismissalEnding: false,

        totalAlerts: 0,
        totalRequestSeconds: 0,
        completedRequests: 0
    }
);

dismissalStartTime = null;

rainyDay = false;

dismissalEnding = false;

let weatherButton =
    document.getElementById(
        "weatherToggle"
    );

if (weatherButton) {

    weatherButton.innerHTML =
        '<i class="fa-solid fa-sun"></i>';

weatherButton.classList.remove(
    "rain"
);

weatherButton.classList.add(
    "sun"
);

}
    location.reload();

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
        window.dismissalHistory || [];

    history.sort((a, b) => {

        let dateA = new Date(
            `${a.date} ${a.endTime}`
        );

        let dateB = new Date(
            `${b.date} ${b.endTime}`
        );

        return dateB - dateA;

    });

    const fastestCPM =
    Math.max(
        ...history.map(
            item =>
                parseFloat(
                    item.carsPerMinute
                ) || 0
        )
    );

const busiestCars =
    Math.max(
        ...history.map(
            item =>
                item.carsReleased || 0
        )
    );


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

            <div class="history-card ${
                i === 0
                    ? "latest-history"
                    : ""
            }">

<div class="history-header">

    <div>

        <div class="history-date-group">

            <h2>
                ${history[i].date}
            </h2>

        </div>

        <div class="history-badges">

            ${i === 0 ? `
                <span class="latest-badge">
                    Latest
                </span>
            ` : ""}

            ${parseFloat(history[i].carsPerMinute) === fastestCPM ? `
                <span class="fastest-badge">
                    Fastest
                </span>
            ` : ""}

            ${history[i].carsReleased === busiestCars ? `
                <span class="busiest-badge">
                    Busiest
                </span>
            ` : ""}

            ${history[i].rainyDay ? `
                <span class="rain-badge">
                    Rain
                </span>
            ` : ""}

            ${history[i].lastEdited ? `
                <span class="edited-badge">
                   Edited
                </span>
            ` : ""}

        </div>

    </div>

    <div class="history-actions">

        <button
            class="edit-history"
            onclick="editHistory('${history[i].id}')">

            <i class="fa-solid fa-pen"></i>

        </button>

        <button
            class="delete-history"
            onclick="deleteHistory('${history[i].id}')">

            <i class="fa-solid fa-trash"></i>

        </button>

    </div>

</div>

                <p>
                    Cars Released:
                    <strong>
                        ${history[i].carsReleased}
                    </strong>
                </p>

                <p>
                    Start Time:
                    <strong>
                        ${history[i].startTime}
                    </strong>
                </p>

                <p>
                    End Time:
                    <strong>
                        ${history[i].endTime}
                    </strong>
                </p>

                <p>
                    Duration:
                    <strong>
                        ${formatDuration(
                            history[i].duration
                        )}
                    </strong>
                </p>

                <p>
                    Cars Per Minute:
                    <strong>
                        ${history[i].carsPerMinute}
                    </strong>
                </p>
<p>
    Alerts:
    <strong>
        ${history[i].totalAlerts ?? 0}
    </strong>
</p>

<p>
    Avg Request Time:
    <strong>
        ${
            history[i].averageRequestTime
                ? formatDuration(
                    history[i].averageRequestTime / 60
                  )
                : "None"
        }
    </strong>
</p>

${history[i].lastEdited ? `
    <p class="history-edited">
        Last Edited:
        <strong>
            ${history[i].lastEdited}
        </strong>
    </p>
` : ""}
            </div>

        `;
    }
}



async function deleteHistory(documentId) {

    let confirmDelete = confirm(
        "Delete this dismissal record?"
    );

    if (!confirmDelete) {
        return;
    }

    try {

        const docRef =
            window.firebaseServices.doc(
                window.firebaseServices.db,
                "dismissalHistory",
                documentId
            );

        await window.firebaseServices.deleteDoc(
            docRef
        );

        console.log(
            "History record deleted"
        );

    } catch (error) {

        console.error(error);

    }
}

function renderSchoolName() {

    let title =
        document.getElementById(
            "schoolTitle"
        );

    if (!title) {
        return;
    }

    title.innerText =
        SCHOOL_NAME;
}

function renderCurrentDismissal() {

    let stats =
        document.getElementById(
            "currentDismissalStats"
        );

    if (!stats) {
        return;
    }

if (
    endingDismissal ||
    dismissalEnding
) {

    stats.innerHTML = `
        <p>
            <i class="fa-solid fa-arrows-rotate"></i>
            Ending dismissal...
        </p>
    `;

    return;

}

    if (!dismissalStartTime) {

        stats.innerHTML = `
    <p>No active dismissal.</p>
    <p class="helper-text">
        Release a student to begin.
    </p>
`;

        return;

    }

    let startTime =
        new Date(
            dismissalStartTime
        );

    let elapsedText =
        getElapsedTime();

    stats.innerHTML = `

        <div class="current-stats">

            <p>
                <strong>
                    Dismissal In Progress
                </strong>
            </p>

            <p>
                Started:
                ${startTime.toLocaleTimeString()}
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

async function addVehicleToFirebase(student) {

    try {

        await window.firebaseServices.addDoc(

            window.firebaseServices.collection(
                window.firebaseServices.db,
                "dismissalQueue"
            ),

            student

        );

        console.log(
            "Student saved to Firestore"
        );

    } catch (error) {

        console.error(error);

    }

}

async function releaseStudentFirebase(student) {

    try {

        const docRef =
            window.firebaseServices.doc(
                window.firebaseServices.db,
                "dismissalQueue",
                student.id
            );

        const newReleasedState =
            !student.released;

        if (
            newReleasedState &&
            student.requestedAt
        ) {

            const requestSeconds =
                Math.floor(
                    (Date.now() -
                    student.requestedAt) / 1000
                );

            const settings =
                await window.loadSettingsFromFirestore();

            const settingsRef =
                window.firebaseServices.doc(
                    window.firebaseServices.db,
                    "settings",
                    "config"
                );

            await window.firebaseServices.updateDoc(
                settingsRef,
                {
                    totalRequestSeconds:
                        (settings.totalRequestSeconds || 0) +
                        requestSeconds,

                    completedRequests:
                        (settings.completedRequests || 0) + 1
                }
            );

        }

        await window.firebaseServices.updateDoc(
            docRef,
            {
                released: newReleasedState,

                releasedAt:
                    newReleasedState
                        ? Date.now()
                        : null
            }
        );

        if (
            student.released &&
            dismissalStartTime
        ) {

            const remainingReleased =
                dismissalQueue.filter(
                    item =>
                        item.released &&
                        item.id !== student.id
                ).length;

            if (remainingReleased === 0) {

                await updateDismissalStartTime(
                    null
                );

                dismissalStartTime = null;

                console.log(
                    "Dismissal start time cleared"
                );

            }

        }

        console.log(
            "Student released"
        );

    } catch (error) {

        console.error(error);

    }

}

async function requestStudentFirebase(student) {

    try {

        const docRef =
            window.firebaseServices.doc(
                window.firebaseServices.db,
                "dismissalQueue",
                student.id
            );

        await window.firebaseServices.updateDoc(
            docRef,
            {
                needsStudent: true
            }
        );

        console.log(
            "Student alert saved"
        );

    } catch (error) {

        console.error(error);

    }
}

async function clearFirebaseQueue() {

    const queueRecords =
        await window.loadQueueFromFirestore();

    for (const student of queueRecords) {

        const docRef =
            window.firebaseServices.doc(
                window.firebaseServices.db,
                "dismissalQueue",
                student.id
            );

        await window.firebaseServices.deleteDoc(
            docRef
        );
    }
}

async function saveHistoryToFirebase(historyRecord) {

    try {

        await window.firebaseServices.addDoc(

            window.firebaseServices.collection(
                window.firebaseServices.db,
                "dismissalHistory"
            ),

            historyRecord

        );

        console.log(
            "History saved to Firestore"
        );

    } catch (error) {

        console.error(error);

    }
}

async function getCurrentQueueFromFirestore() {

    const records =
        await window.loadQueueFromFirestore();

    return records || [];
}

async function saveSettingsToFirebase(settings) {

    try {

        const docRef =
            window.firebaseServices.doc(
                window.firebaseServices.db,
                "settings",
                "config"
            );

        await window.firebaseServices.updateDoc(
            docRef,
            settings
        );

        console.log(
            "Settings saved to Firestore"
        );

    } catch (error) {

        console.error(error);

    }
}

async function updateDismissalStartTime(startTime) {

    try {

        const docRef =
            window.firebaseServices.doc(
                window.firebaseServices.db,
                "settings",
                "config"
            );

        await window.firebaseServices.updateDoc(
            docRef,
            {
                dismissalStartTime: startTime
            }
        );

    } catch (error) {

        console.error(error);

    }
}

async function editVehicleFirebase(
    student,
    newTag,
    oldTag
) {

    try {

        const docRef =
            window.firebaseServices.doc(
                window.firebaseServices.db,
                "dismissalQueue",
                student.id
            );

        await window.firebaseServices.updateDoc(
            docRef,
            {
                tag: newTag,
                editedFrom: oldTag
            }
        );

        console.log(
            "Student edited"
        );

    } catch (error) {

        console.error(error);

    }
}

function updateConnectionStatus() {

    let status =
        document.getElementById(
            "connectionStatus"
        );

    if (!status) {
        return;
    }

    if (!navigator.onLine) {

        status.innerHTML =
            "● Offline";

        status.classList.remove(
            "connection-online",
            "connection-syncing"
        );

        status.classList.add(
            "connection-offline"
        );

        return;

    }

    const syncing =
        dismissalQueue.some(
            student => student.pending
        );

    if (syncing) {

        status.innerHTML =
            "● Syncing";

        status.classList.remove(
            "connection-online",
            "connection-offline"
        );

        status.classList.add(
            "connection-syncing"
        );

    } else {

        status.innerHTML =
            "● Connected";

        status.classList.remove(
            "connection-syncing",
            "connection-offline"
        );

        status.classList.add(
            "connection-online"
        );

    }

}

function toggleFullscreen() {

    let button =
        document.getElementById(
            "fullscreenBtn"
        );

    if (
        !document.fullscreenElement
    ) {

        document.documentElement
            .requestFullscreen();

        button.innerHTML =
            '<i class="fa-solid fa-xmark"></i>';

    }
    else {

        document.exitFullscreen();

        button.innerHTML =
            '<i class="fa-solid fa-expand"></i>';

    }

}

document.addEventListener(
    "fullscreenchange",
    () => {

        let button =
            document.getElementById(
                "fullscreenBtn"
            );

        if (!button) {
            return;
        }

        button.innerHTML =
            document.fullscreenElement
                ? '<i class="fa-solid fa-xmark"></i>'
                : '<i class="fa-solid fa-expand"></i>';

    }
);

async function editHistory(documentId) {

    let record =
        window.dismissalHistory.find(
            item => item.id === documentId
        );

    if (!record) {
        return;
    }

    let startTime =
        prompt(
            "Start Time",
            record.startTime
        );

    if (startTime === null) {
        return;
    }

    let endTime =
        prompt(
            "End Time",
            record.endTime
        );

    if (endTime === null) {
        return;
    }

    let carsReleased =
        prompt(
            "Cars Released",
            record.carsReleased
        );

let rainyDay = confirm(
    "Weather Condition\n\n" +
    "OK = 🌧 Rainy Day\n" +
    "Cancel = ☀ Normal Day"
);   

    if (carsReleased === null) {
        return;
    }

    carsReleased =
        parseInt(carsReleased);

    let start =
        new Date(
            `${record.date} ${startTime}`
        );

    let end =
        new Date(
            `${record.date} ${endTime}`
        );

    let duration =
        (
            end - start
        ) / 60000;

    let carsPerMinute =
        (
            carsReleased /
            Math.max(duration, 1)
        ).toFixed(1);

    try {

        const docRef =
            window.firebaseServices.doc(
                window.firebaseServices.db,
                "dismissalHistory",
                documentId
            );

await window.firebaseServices.updateDoc(
    docRef,
    {
        startTime,
        endTime,
        carsReleased,
        duration,
        carsPerMinute,
        rainyDay,

        lastEdited:
            new Date()
                .toLocaleString()
    }
);

    } catch (error) {

        console.error(error);

    }

}

async function toggleRainDay() {

    rainyDay = !rainyDay;

    let button =
        document.getElementById(
            "weatherToggle"
        );

    if (!button) {
        return;
    }

    if (rainyDay) {

        button.innerHTML =
            '<i class="fa-solid fa-cloud-rain"></i>';

        button.classList.remove(
            "sun"
        );

        button.classList.add(
            "rain"
        );

    } else {

        button.innerHTML =
            '<i class="fa-solid fa-sun"></i>';

        button.classList.remove(
            "rain"
        );

        button.classList.add(
            "sun"
        );

    }

    const settingsRef =
        window.firebaseServices.doc(
            window.firebaseServices.db,
            "settings",
            "config"
        );

    await window.firebaseServices.updateDoc(
        settingsRef,
        {
            rainyDay
        }
    );

}

function getAlertAge(student) {

    if (!student.requestedAt) {
        return "";
    }

    let endTime =
        student.released &&
        student.releasedAt
            ? student.releasedAt
            : Date.now();

    const elapsedSeconds =
        Math.floor(
            (endTime - student.requestedAt) /
            1000
        );

    const minutes =
        Math.floor(
            elapsedSeconds / 60
        );

    const seconds =
        elapsedSeconds % 60;

    return `${minutes}:${seconds
        .toString()
        .padStart(2, "0")}`;

}

function releaseStudentFromBoard(studentId) {

    if (!boardReleaseEnabled) {
        return;
    }

    let student =
        dismissalQueue.find(
            item => item.id === studentId
        );

    if (!student) {
        return;
    }

    let confirmed = confirm(
        "Release tag " +
        student.tag +
        "?"
    );

    if (!confirmed) {
        return;
    }

    releaseStudentFirebase(
        student
    );

}

function releaseStudentFromBoard(studentId) {

    if (!boardReleaseEnabled) {
        return;
    }

    let student =
        dismissalQueue.find(
            item => item.id === studentId
        );

    if (!student) {
        return;
    }

    let confirmed = confirm(
        "Release tag " +
        student.tag +
        "?"
    );

    if (!confirmed) {
        return;
    }

    releaseStudentFirebase(
        student
    );

}

async function releaseStudentFromBoard(studentId) {

    if (!boardReleaseEnabled) {
        return;
    }

    let student =
        dismissalQueue.find(
            item => item.id === studentId
        );

    if (!student) {
        return;
    }

    let confirmed = confirm(
        "Release tag " +
        student.tag +
        "?\n\n" +
        "Student should report to Spot #" +
        student.spot
    );

    if (!confirmed) {
        return;
    }

    if (!dismissalStartTime) {

        dismissalStartTime =
            new Date().toISOString();

        await updateDismissalStartTime(
            dismissalStartTime
        );

    }

    releaseStudentFirebase(
        student
    );

}