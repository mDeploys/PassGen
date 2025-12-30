import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from 'cors'

interface ActivationRequest {
  install_id: string
  user_email: string
  payment_method?: string
  payment_amount?: number
}

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Parse request body
    const { install_id, user_email, payment_method, payment_amount }: ActivationRequest = await req.json()

    if (!install_id || !user_email) {
      return new Response(JSON.stringify({ error: 'Missing required fields: install_id, user_email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Save to Supabase
    const { data, error } = await supabase
      .from('activation_requests')
      .insert({
        install_id,
        user_email,
        payment_method: payment_method || 'paypal',
        payment_amount: payment_amount || 15.00,
        payment_currency: 'USD',
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return new Response(JSON.stringify({ error: 'Failed to save activation request' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Send Discord notification
    const discordWebhookUrl = Deno.env.get('DISCORD_WEBHOOK_URL')
    if (discordWebhookUrl) {
      try {
        const embed = {
          title: '🎉 New PassGen Activation Request!',
          color: 0x3b82f6,
          fields: [
            {
              name: '👤 User Email',
              value: user_email,
              inline: true
            },
            {
              name: '🆔 Install ID',
              value: `\`${install_id}\``,
              inline: true
            },
            {
              name: '💰 Payment',
              value: `${payment_method || 'paypal'} - $${payment_amount || 15.00}`,
              inline: true
            },
            {
              name: '📅 Time',
              value: new Date().toLocaleString(),
              inline: false
            }
          ],
          footer: {
            text: 'PassGen Activation Dashboard'
          }
        }

        await fetch(discordWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ embeds: [embed] })
        })

        console.log('Discord notification sent')
      } catch (discordError) {
        console.error('Discord notification failed:', discordError)
        // Don't fail the request if Discord fails
      }
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})