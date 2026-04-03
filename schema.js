const joi = require('joi'); 


module.exports.listingSchema = joi.object({  
    
    listing: joi.object({
        title: joi.string().required(),
        description: joi.string().allow(''),
       image: joi.object({
            filename: joi.string().allow(''),
            url: joi.string().uri().allow('').default("https://images.unsplash.com/photo-1625505826533-5c80aca7d157?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGdvYXxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=800&q=60")
        }).default({ filename: '', url: '' }),
        price: joi.number().required(),
        location: joi.string().required(),
        country: joi.string().required()
    }).required()
});

module.exports.reviewSchema = joi.object({
    review: joi.object({
        rating: joi.number().required().min(1).max(5),
        comment: joi.string().required(),
    }).required()
})


