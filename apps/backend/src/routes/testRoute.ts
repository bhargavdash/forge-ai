import { Router } from "express";
import { openRouterModel } from "../llm/openRouterClient";


const router = Router();

router.get('/health', (req, res) => {
    res.send("Test route is healthy");
})

router.post('/openRouter', async (req, res) => {
    try {
        // test endpoint to get response from openrouter api
        const prompt: string = req.body;
        console.log("This is the prompt: ", prompt)
        console.log("Calling openrouter model...")
        const response = await openRouterModel(prompt);

        console.log("Received this response from openrouter llm: ", response);

        res.status(200).json({
            success: true,
            data: response
        })
    } catch (err){
        console.log(err);
        res.status(400).json({
            success: false,
            error: err
        }) 
    }
})

export default router;