'use strict';
$(document).ready(async function () {
    const res = await axios.get('https://script.google.com/macros/s/AKfycbxCKtyJP8X3vpOXTDCaENAesVXa8gWwzw4BSAnk6iIGWz8FFMqi/exec');
    const jres = await res.data;
    interset(jres);
    
});

const interset = async function(jres){
    const table = document.querySelector('#tblReportResultsDemographics');
        await jres.forEach(async function (datarow) {
            const newRow = await document.createElement('tr');
            const Rowdiv = await document.createElement('div');
            newRow.setAttribute('class', 'rows-employees');
            newRow.setAttribute('scope', 'row');
            for (const property in datarow) {
                if (datarow.hasOwnProperty(property) && property.toLocaleLowerCase() !== 'created at') {
                    let cell = await document.createElement('td');
                    if (property === "download") {
                        const p = await document.createElement('p');
                        p.textContent = 'download'
                        const alink = await document.createElement('a');
                        await alink.setAttribute('href', datarow[property]);
                        alink.appendChild(p)
                        cell.appendChild(alink);
                    } else if (property === "Link") {
                        const p = await document.createElement('p');
                        p.textContent = 'Link'
                        const alink = await document.createElement('a');
                        await alink.setAttribute('href', datarow[property]);
                        alink.setAttribute('target', 'blank');
                        alink.appendChild(p)
                        cell.appendChild(alink);
                    } else if (property === "Last Updated") {

                        cell.textContent = moment(datarow[property], "YYYYMMDD").fromNow();
                    } else {
                        cell.textContent = datarow[property];
                    }
                    cell.setAttribute('class', 'align-content-xl-end');
                    cell.setAttribute('style', 'word-wrap: break-word;max-width: 150px;');
                    
                    newRow.appendChild(cell);
                    Rowdiv.setAttribute('class', 'd-flex flex-wrap-reverse');
                    Rowdiv.appendChild(newRow);
                }
                if (property === 'Name') {
                    const option = await document.createElement('option');
                    const series = document.querySelector('#series');
                    option.textContent = datarow[property];
                    
                    if (! series.textContent.includes(option.textContent)){
                        series.appendChild(option);
                    };
                }
            }
            table.appendChild(newRow);
        })
}

function LoadCurrentReport(oResults) {
    var jsonString = oResults;
       //Load  datatable
    var oTblReport = $("#tblReportResultsDemographics")
    oTblReport.DataTable ({
        "data" : jsonString,
        "columns" : [
            // { "data" : "id" },
            { "data" : "Name" },
            { "data" : "parents" },
            { "data" : "Type" },
            // { "data" : "download" },
            { "data" : "Size" },
            // { "data" : "Link" },
            { "data" : "Last Updated" },
            { "data" : "Owner" }
        ]
    });
}




$('.custom-select-md').click((function () {
    const value = $(this).val().toLowerCase();
    $(".rows-employees").filter(function () {
        $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1)
    });
}));

$('.form-control').keyup(function () {
    const value = $(this).val().toLowerCase();
    $(".rows-employees").filter(function () {
        $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1)
    });
});

