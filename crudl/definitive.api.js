var definitive=definitive || {};

definitive.rest=function(uri, method, data, success, fail, error){
	console.log(data)
       $.ajax({
        "url":uri,
        "type":method,
        "data":JSON.stringify(data),
        "contentType":"application/json",
        "dataType":"json",
        success:function (data, textStatus, xhr) {
            console.log(data);
            if (xhr.status>=200 && xhr.status<300)
            {
                if(data !=null || data!=undefined)
                {
                    success(data);
                }
                else if(success)
                {
                    success(null);
                }
            }
            else
                fail(data)

        },
        error:function(e) {
            if (error)
                error(e);
        }

    });
};

var jquery_url="https://code.jquery.com/jquery-3.6.0.min.js";

function on_doc_ready() {
    $(document).ready(() => {
		if (definitive.onready) 
			definitive.onready();
	});
}

if(typeof jQuery=='undefined') {
    var headTag = document.getElementsByTagName("head")[0];
    var jqTag = document.createElement('script');
    jqTag.type = 'text/javascript';
    jqTag.src = jquery_url;
    jqTag.onload = on_doc_ready;
    headTag.appendChild(jqTag);
} else {
     on_doc_ready();
}