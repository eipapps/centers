function LoadCurrentReport(oResults) {
 
    
    var jsonString = oResults;
     
   //Load  datatable
    var oTblReport = $("#tblReportResultsDemographics")
 
    oTblReport.DataTable ({
        "data" : jsonString,
        "columns" : [
            // { "data" : "id" },
            { "data" : "name" },
            { "data" : "email" },
            { "data" : "center" },
            { "data" : "pronvince" },
            { "data" : "posicion" }
        ]
    });
    return true;
}


$(document).ready(async function () {
    $('#tblReportResultsDemographics').hide();
    const res = await axios.get('https://script.google.com/macros/s/AKfycbxFPRq-4fY_oUSdkIkzf-4grcdcHSbbiZUNpsjzDVKhFvyFn0c/exec');
    const jres = await res.data;
    let ready = false;
    ready = await LoadCurrentReport(jres);
    if(ready){
        $('#loading').fadeOut();
        $('#tblReportResultsDemographics').fadeIn();

    }
    // const table = document.querySelector('#example');
    // await jres.forEach(async function (datarow) {
    // 	let newRow = await document.createElement('tr');
    // 	newRow.setAttribute('class', 'rows-employees');
    // 	for (const property in datarow) {
    // 		if (datarow.hasOwnProperty(property)
    // 			&& property !== 'id'
    // 			&& property !== 'phone'
    // 		) {
    // 			let cell = await document.createElement('td');
    // 			cell.textContent = datarow[property];
    // 			newRow.appendChild(cell);
    // 		}
    // 	}
    // 	table.appendChild(newRow);
    // })

});


$('.form-control').keyup(function () {
    const value = $(this).val().toLowerCase();
    $(".rows-employees").filter(function () {
        $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1)
    });
});

