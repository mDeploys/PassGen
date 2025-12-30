#!/usr/bin/env node
// Discord Bot for PassGen License Activation
const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Discord bot setup
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
})

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Bot ready event
client.once('ready', async () => {
  console.log(`🤖 PassGen Bot is online as ${client.user.tag}!`)

  // Register slash commands
  const commands = [
    new SlashCommandBuilder()
      .setName('pending')
      .setDescription('View pending activation requests'),

    new SlashCommandBuilder()
      .setName('activate')
      .setDescription('Activate a license')
      .addStringOption(option =>
        option.setName('install_id')
          .setDescription('The install ID to activate')
          .setRequired(true)
      )
      .addStringOption(option =>
        option.setName('activation_code')
          .setDescription('Custom activation code (optional)')
          .setRequired(false)
      ),

    new SlashCommandBuilder()
      .setName('stats')
      .setDescription('View activation statistics')
  ]

  try {
    await client.application.commands.set(commands)
    console.log('✅ Slash commands registered!')
  } catch (error) {
    console.error('❌ Failed to register commands:', error)
  }
})

// Handle slash commands
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return

  const { commandName } = interaction

  try {
    switch (commandName) {
      case 'pending':
        await handlePendingCommand(interaction)
        break

      case 'activate':
        await handleActivateCommand(interaction)
        break

      case 'stats':
        await handleStatsCommand(interaction)
        break
    }
  } catch (error) {
    console.error('Command error:', error)
    await interaction.reply({
      content: '❌ An error occurred while processing your command.',
      ephemeral: true
    })
  }
})

// Handle /pending command
async function handlePendingCommand(interaction) {
  await interaction.deferReply({ ephemeral: true })

  try {
    const { data: requests, error } = await supabase
      .from('activation_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) throw error

    if (!requests || requests.length === 0) {
      await interaction.editReply('📋 No pending activation requests.')
      return
    }

    const embed = new EmbedBuilder()
      .setTitle('📋 Pending Activation Requests')
      .setColor(0xffa500)
      .setTimestamp()

    let description = ''
    requests.forEach((req, index) => {
      description += `**${index + 1}.** \`${req.install_id}\`\n`
      description += `👤 ${req.user_email}\n`
      description += `💰 ${req.payment_method} - $${req.payment_amount}\n`
      description += `📅 ${new Date(req.created_at).toLocaleDateString()}\n\n`
    })

    embed.setDescription(description)

    await interaction.editReply({ embeds: [embed] })
  } catch (error) {
    console.error('Pending command error:', error)
    await interaction.editReply('❌ Failed to fetch pending requests.')
  }
}

// Handle /activate command
async function handleActivateCommand(interaction) {
  await interaction.deferReply({ ephemeral: true })

  const installId = interaction.options.getString('install_id')
  const customCode = interaction.options.getString('activation_code')

  try {
    // Find the request
    const { data: request, error: findError } = await supabase
      .from('activation_requests')
      .select('*')
      .eq('install_id', installId)
      .eq('status', 'pending')
      .single()

    if (findError || !request) {
      await interaction.editReply(`❌ No pending request found for install ID: \`${installId}\``)
      return
    }

    // Generate activation code if not provided
    const activationCode = customCode || generateActivationCode()

    // Update the request
    const { error: updateError } = await supabase
      .from('activation_requests')
      .update({
        status: 'activated',
        activation_code: activationCode,
        activated_at: new Date().toISOString(),
        activated_by: interaction.user.username
      })
      .eq('id', request.id)

    if (updateError) throw updateError

    // Send success embed
    const embed = new EmbedBuilder()
      .setTitle('✅ License Activated!')
      .setColor(0x00ff00)
      .addFields(
        { name: '👤 User', value: request.user_email, inline: true },
        { name: '🆔 Install ID', value: `\`${installId}\``, inline: true },
        { name: '🔑 Activation Code', value: `\`${activationCode}\``, inline: false },
        { name: '🤖 Activated By', value: interaction.user.username, inline: true }
      )
      .setTimestamp()

    await interaction.editReply({ embeds: [embed] })

    // Send public notification
    const publicEmbed = new EmbedBuilder()
      .setTitle('🎉 License Activated!')
      .setColor(0x00ff00)
      .setDescription(`License for **${request.user_email}** has been activated!`)
      .setTimestamp()

    await interaction.followUp({ embeds: [publicEmbed] })

  } catch (error) {
    console.error('Activate command error:', error)
    await interaction.editReply('❌ Failed to activate license.')
  }
}

// Handle /stats command
async function handleStatsCommand(interaction) {
  await interaction.deferReply({ ephemeral: true })

  try {
    const { data: stats, error } = await supabase
      .from('dashboard_stats')
      .select('*')
      .single()

    if (error) throw error

    const embed = new EmbedBuilder()
      .setTitle('📊 Activation Statistics')
      .setColor(0x0099ff)
      .addFields(
        { name: '📋 Total Requests', value: stats.total_requests?.toString() || '0', inline: true },
        { name: '⏳ Pending', value: stats.pending_requests?.toString() || '0', inline: true },
        { name: '✅ Activated', value: stats.activated_requests?.toString() || '0', inline: true },
        { name: '💰 Total Revenue', value: `$${stats.total_revenue?.toString() || '0'}`, inline: true }
      )
      .setTimestamp()

    await interaction.editReply({ embeds: [embed] })
  } catch (error) {
    console.error('Stats command error:', error)
    await interaction.editReply('❌ Failed to fetch statistics.')
  }
}

// Generate activation code
function generateActivationCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 16; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Login bot
client.login(process.env.DISCORD_BOT_TOKEN)
  .then(() => console.log('🔐 Bot logged in successfully'))
  .catch(error => {
    console.error('❌ Bot login failed:', error)
    process.exit(1)
  })

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down bot...')
  client.destroy()
  process.exit(0)
})