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
}