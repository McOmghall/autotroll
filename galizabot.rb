require 'twitter_ebooks'
require 'json'
require 'net/http'
require 'nokogiri'
require 'stringio'

begin
  require_relative "oauth_data"
rescue LoadError
  module TwitterOAuthData
    # Twitter analysis galiza https://apps.twitter.com/app/8301917/permissions
    def TwitterOAuthData.options_twitter
      {   
        :consumer_key        => ENV['CONSUMER_KEY'],
        :consumer_secret     => ENV['CONSUMER_SECRET'],
        :access_token        => ENV['ACCESS_TOKEN'],
        :access_token_secret => ENV['ACCESS_TOKEN_SECRET']    
      }
    end
  end
end

class Galizabot < Ebooks::Bot
  # Configuration here applies to all MyBots
  def configure
    # Consumer details come from registering an app at https://dev.twitter.com/
    # Once you have consumer details, use "ebooks auth" for new access tokens
    self.consumer_key = TwitterOAuthData.options_twitter[:consumer_key]
    self.consumer_secret = TwitterOAuthData.options_twitter[:consumer_secret]
  end
  
  def dump_custom_search
    search_results = (self.twitter.search("galiciabilingue", :result_type => "recent").collect.to_a +
    self.twitter.search("amesanl", :result_type => "recent").collect.to_a +
    self.twitter.search("queremosgalego", :result_type => "recent").collect.to_a +
    self.twitter.search("obloque", :result_type => "recent").collect.to_a +
    self.twitter.search("from:en_marea", :result_type => "recent").collect.to_a)
    
    search_results.each do |tweet|
      puts tweet.text
    end
    
    File.open('./search_results.json', 'w') do |f|
      search_results = search_results.map(&:attrs).each { |tw|  tw.delete(:entities)  }
      f.write(JSON.pretty_generate(search_results))
    end
  end
  
  def dump_galiza_is_thinking
    log "Getting thoughts of Galiza"
    search_text = (self.twitter.search("galiza", :result_type => "recent").collect.to_a + self.twitter.search("galicia", :result_type => "recent").collect.to_a).map do |tweet|
	  tweet.text.gsub(/(?:f|ht)tps?:\/[^\s]+/, '').gsub(/RT \@[a-zA-Z0-9]+\:/, '')
    end

	Ebooks::Model.new.consume_lines(search_text).keywords.take(100).select{|e| e.length > 3}.sample
  end

  def generate_model_samples
    model = Ebooks::Model.load('./model/search_results.model')
    100.times do
      log model.make_statement(140)
    end
  end

  def spawn_common_thought_about common_thought, message
    log "Trying to spawn thought about #{common_thought}"
	if common_thought.length > 3 then
	  uri = URI('https://www.google.es/search')
	  params = { :q => common_thought, :tbm => 'isch' } # Query string from twitter and image search
      uri.query = URI.encode_www_form(params)
	  google_image_search = Net::HTTP.get_response(uri)

	  log "GETting #{uri} => #{google_image_search.inspect}"

      if google_image_search.is_a?(Net::HTTPSuccess) then
	    log "GET was a SUCCESS"
	    log "Body length #{google_image_search.body.length}"
	    imgs = Nokogiri::HTML(google_image_search.body).css("img")
	    log "Found #{imgs.length} images"
		uri_img = URI(imgs.to_a.sample.attribute("src").value)
		log "GETting random url: #{uri_img}"

		img = Net::HTTP.get_response(uri_img)

		if img.is_a?(Net::HTTPSuccess) then
		  log "Got IMG: #{img.body.length}"
		  as_IO_string = StringIO.new.puts img.body

		  log "Updated #{self.twitter.update_with_media(message, as_IO_string)}"
		end
      end
    end
  end

  ##########################
  # BOT STANDARD OPERATION #
  ##########################
  def on_startup
    log 'starting up'
    model = Ebooks::Model.load('./model/search_results.model')
    tweet "Galiza acordou: #{model.make_statement(140)}"
    log 'made an statement'
	
	thinking = dump_galiza_is_thinking
	spawn_common_thought_about thinking, model.make_response(thinking, 60)
    
	# Make a random statement every hour
	scheduler.every '60m' do
      tweet "Galiza di: #{model.make_statement(140)}"
    end

	# Get a random image from a random frequent term every hour and a half
	scheduler.every '121m' do
	  thinking = dump_galiza_is_thinking
	  spawn_common_thought_about thinking, "Galiza pensa #{model.make_response(thinking, 60)}"
	end
  end

  def on_message(dm)
    # Reply to a DM
    # reply(dm, "secret secrets")
  end

  def on_follow(user)
    # Follow a user back
    # follow(user.screen_name)
  end

  def on_mention(tweet)
    # Reply to a mention
    # reply(tweet, meta(tweet).reply_prefix + "oh hullo")
  end

  def on_timeline(tweet)
    # Reply to a tweet in the bot's timeline
    # reply(tweet, meta(tweet).reply_prefix + "nice tweet")
  end

  def on_favorite(user, tweet)
    follow(user.screen_name)
  end

  def on_retweet(tweet)
    follow(tweet.user.screen_name)
  end
end
