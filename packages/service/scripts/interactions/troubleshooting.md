# Troubleshooting Guide

Let's get your endpoint working! Here are common issues:

## ❌ "404 Not Found"

**Cause:** Invalid collection ID

- ✅ Double-check your `publicId` in the dashboard
- ✅ Make sure you're using the public ID, not the internal UUID
- ✅ Verify the collection isn't deleted

## ❌ "No matching interaction found"

**Cause:** Query doesn't match any interactions closely enough

- ✅ Add more interaction examples to your collection
- ✅ Check your similarity threshold settings
- ✅ Set a default/fallback response
- ✅ Test with exact input text from your interactions

## ❌ "Rate limit exceeded"

**Cause:** Too many requests in a short time

- ✅ Check your current tier limits
- ✅ Implement request caching on your end
- ✅ Upgrade to a higher tier if needed

## ❌ Responses are slow

**Cause:** Collection has many interactions

- ✅ Consider splitting into multiple focused collections
- ✅ Archive old/unused interactions
- ✅ Contact support for optimization help

## 🆘 Still having issues?

Reach out to our support team at support@loremllm.com or check our documentation at docs.loremllm.com
